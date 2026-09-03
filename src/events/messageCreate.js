import { calculateLevel, xpForLevel } from '../utils/formatters.js';
import { db } from '../database/db.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { getAiChatReply } from '../utils/aiChat.js';
import { musicManager } from '../utils/musicManager.js';

const xpCooldowns = new Set();
const spamTracker = new Map();

export const once = false;

export async function execute(message, client) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const guildSettings = db.getGuild(guildId);

  // --- AUTOMOD CHECKS (Skip for Mods/Admins) ---
  const isMod = message.member?.permissions.has(PermissionFlagsBits.ManageMessages) || message.member?.permissions.has(PermissionFlagsBits.Administrator);

  if (!isMod) {
    const automod = guildSettings.automod || {};

    // 1. Anti-Link
    if (automod.antiLink) {
      const isLink = message.content.includes('http://') || 
                     message.content.includes('https://') || 
                     message.content.includes('discord.gg/') || 
                     message.content.includes('discord.com/invite/');
      if (isLink) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send("⚠️ " + message.author.toString() + ", links are not allowed here!");
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // 2. Bad Words
    if (automod.badWords && automod.badWords.length > 0) {
      const contentLower = message.content.toLowerCase();
      const hasBadWord = automod.badWords.some(word => contentLower.includes(word.toLowerCase()));
      if (hasBadWord) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send("⚠️ " + message.author.toString() + ", watch your language!");
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // 3. Anti-Caps
    if (automod.antiCaps && message.content.length > 8) {
      const upperCount = message.content.replace(/[^A-Z]/g, '').length;
      const totalLetters = message.content.replace(/[^a-zA-Z]/g, '').length;
      if (totalLetters > 6 && (upperCount / totalLetters) > 0.7) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send("⚠️ " + message.author.toString() + ", please do not type in all caps!");
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // 4. Anti-Spam
    if (automod.antiSpam) {
      const now = Date.now();
      const userData = spamTracker.get(userId) || { count: 0, lastMsg: now };
      if (now - userData.lastMsg < 4000) {
        userData.count++;
        if (userData.count >= 5) {
          await message.delete().catch(() => {});
          await message.member.timeout(60 * 1000, 'AutoMod: Rapid Spamming').catch(() => {});
          message.channel.send("🚫 " + message.author.toString() + " has been timed out for 1 minute for rapid spamming.");
          spamTracker.delete(userId);
          return;
        }
      } else {
        userData.count = 1;
      }
      userData.lastMsg = now;
      spamTracker.set(userId, userData);
    }
  }

  // --- AFK SYSTEM CHECK ---
  const authorAfk = db.getAfk(guildId, userId);
  if (authorAfk) {
    db.removeAfk(guildId, userId);
    const welcomeBack = await message.reply("👋 Welcome back " + message.author.toString() + "! I removed your AFK status.");
    setTimeout(() => welcomeBack.delete().catch(() => {}), 6000);
  }

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(async (mentionedUser) => {
      if (mentionedUser.id === userId) return;
      const afkData = db.getAfk(guildId, mentionedUser.id);
      if (afkData) {
        const timeAgo = Math.floor(afkData.timestamp / 1000);
        message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription("💤 **" + mentionedUser.username + "** is currently AFK: **" + afkData.reason + "** (<t:" + timeAgo + ":R>)")
          ]
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 8000));
      }
    });
  }

  // --- PREFIX MUSIC COMMANDS FOR ALL MEMBERS IN ALL CHANNELS (!play, !p, !skip, etc.) ---
  const prefix = '!';
  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'play' || cmd === 'p') {
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) {
        return message.reply('❌ You must join a Voice Channel first before playing music!').catch(() => {});
      }
      const query = args.join(' ');
      if (!query) {
        return message.reply('❌ Please provide a song name or link! Example: `!play Michael Jackson` or `!p Kesariya`').catch(() => {});
      }

      const statusMsg = await message.reply('🔍 Searching and loading track...').catch(() => {});
      try {
        const res = await musicManager.resolveAndPlay(voiceChannel, message.channel, query, message.author);
        if (statusMsg) statusMsg.delete().catch(() => {});

        if (res.status === 'queued') {
          message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('➕ Added to Queue (Position #' + res.position + ')')
                .setDescription('**[' + res.track.title + '](' + res.track.url + ')**')
                .setThumbnail(res.track.thumbnail)
                .addFields(
                  { name: '👤 Artist', value: res.track.artist, inline: true },
                  { name: '⏱️ Duration', value: res.track.duration, inline: true }
                )
            ]
          }).catch(() => {});
        } else {
          message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎵 Playing Track')
                .setDescription('**[' + res.track.title + '](' + res.track.url + ')** in **' + voiceChannel.name + '**')
                .setThumbnail(res.track.thumbnail)
                .addFields(
                  { name: '👤 Artist', value: res.track.artist, inline: true },
                  { name: '⏱️ Duration', value: res.track.duration, inline: true }
                )
            ]
          }).catch(() => {});
        }
      } catch (err) {
        if (statusMsg) statusMsg.delete().catch(() => {});
        if (err.message.startsWith('MISSING_PERMS:')) {
          message.reply('⚠️ ' + err.message.replace('MISSING_PERMS: ', '')).catch(() => {});
        } else if (err.message.startsWith('NO_RESULTS:')) {
          message.reply('❌ Could not find any song matching that title. Try another name!').catch(() => {});
        } else {
          message.reply('❌ Could not stream this song. Skipping...').catch(() => {});
        }
      }
      return;
    }

    if (cmd === 'skip' || cmd === 's') {
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) return message.reply('❌ Join a voice channel first!').catch(() => {});
      const skipped = musicManager.skip(guildId);
      return message.reply(skipped ? '⏭️ Track skipped!' : '❌ No track is currently playing.').catch(() => {});
    }

    if (cmd === 'pause') {
      const paused = musicManager.pause(guildId);
      return message.reply(paused ? '⏸️ Playback paused.' : '❌ Nothing is currently playing.').catch(() => {});
    }

    if (cmd === 'resume') {
      const resumed = musicManager.resume(guildId);
      return message.reply(resumed ? '▶️ Playback resumed.' : '❌ Music is not paused.').catch(() => {});
    }

    if (cmd === 'stop' || cmd === 'leave' || cmd === 'dc') {
      musicManager.stop(guildId);
      return message.reply('⏹️ Stopped playback and cleared queue.').catch(() => {});
    }

    if (cmd === 'queue' || cmd === 'q') {
      const q = musicManager.getQueue(guildId);
      if (!q.currentTrack && q.queue.length === 0) {
        return message.reply('📜 The queue is empty.').catch(() => {});
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎶 Server Music Queue')
        .setDescription(
          '**Now Playing:** ' + (q.currentTrack ? q.currentTrack.title : 'None') + '\n\n' + 
          (q.queue.length > 0 ? q.queue.slice(0, 10).map((t, i) => `${i + 1}. **${t.title}**`).join('\n') : 'No upcoming songs.')
        );
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (cmd === 'volume' || cmd === 'vol') {
      const vol = parseInt(args[0]);
      if (isNaN(vol) || vol < 1 || vol > 150) {
        return message.reply('❌ Please enter a volume level between 1 and 150. Example: `!vol 80`').catch(() => {});
      }
      const q = musicManager.getQueue(guildId);
      q.volume = vol;
      return message.reply('🔊 Volume set to **' + vol + '%**').catch(() => {});
    }

    if (cmd === 'loop') {
      const q = musicManager.getQueue(guildId);
      q.isLooping = !q.isLooping;
      return message.reply('🔁 Loop mode is now **' + (q.isLooping ? 'ENABLED' : 'DISABLED') + '**').catch(() => {});
    }
  }

  // --- AUTO AI CHATBOT SYSTEM ---
  const isAiChannel = guildSettings.aiChatChannel && message.channel.id === guildSettings.aiChatChannel;
  const isBotMentioned = message.mentions.has(client.user) && !message.mentions.everyone;

  if (isAiChannel || isBotMentioned) {
    const cleanPrompt = message.content.replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '').trim();
    if (cleanPrompt.length > 0) {
      await message.channel.sendTyping().catch(() => {});
      const reply = await getAiChatReply(cleanPrompt, message.author.username);
      return message.reply(reply).catch(() => {});
    }
  }

  // --- LEVELING & XP SYSTEM ---
  const cooldownKey = guildId + '_' + userId;
  if (!xpCooldowns.has(cooldownKey)) {
    xpCooldowns.add(cooldownKey);
    setTimeout(() => xpCooldowns.delete(cooldownKey), 60000);

    const randomXp = Math.floor(Math.random() * 11) + 15;
    const userProfile = db.getUser(guildId, userId);

    const currentLevel = userProfile.level || 1;
    const newXp = (userProfile.xp || 0) + randomXp;
    const newLevel = calculateLevel(newXp);
    const newMessages = (userProfile.messagesCount || 0) + 1;

    db.updateUser(guildId, userId, {
      xp: newXp,
      level: newLevel,
      messagesCount: newMessages
    });

    if (newLevel > currentLevel) {
      const levelEmbed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('⭐ Level Up!')
        .setDescription("🎉 Congratulations " + message.author.toString() + "! You leveled up to **Level " + newLevel + "**!")
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      const targetChannel = guildSettings.levelChannel 
        ? message.guild.channels.cache.get(guildSettings.levelChannel) 
        : message.channel;

      if (targetChannel) {
        targetChannel.send({ embeds: [levelEmbed] }).catch(() => {});
      }

      if (guildSettings.levelRoles && guildSettings.levelRoles[newLevel]) {
        const roleId = guildSettings.levelRoles[newLevel];
        const role = message.guild.roles.cache.get(roleId);
        if (role && !message.member.roles.cache.has(roleId)) {
          message.member.roles.add(role).catch(() => {});
        }
      }
    }
  }
}