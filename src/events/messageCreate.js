import { calculateLevel, xpForLevel } from '../utils/formatters.js';
import { db } from '../database/db.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { getAiChatReply } from '../utils/aiChat.js';

const xpCooldowns = new Set();
const spamTracker = new Map();

export const once = false;

export async function execute(message, client) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const guildSettings = db.getGuild(guildId);

  const channelName = (message.channel.name || '').toLowerCase();
  const channelMatchesAi = channelName.includes('ai-chat') || 
                           channelName.includes('ai_chat') || 
                           (channelName.includes('ai') && channelName.includes('chat')) ||
                           channelName.includes('ai-bot') ||
                           channelName.includes('bot-chat');
  const isAiChannel = channelMatchesAi || (guildSettings.aiChatChannel && message.channel.id === guildSettings.aiChatChannel);

  // --- AUTOMOD CHECKS (Skip for Mods/Admins) ---
  const isMod = message.member?.permissions.has(PermissionFlagsBits.ManageMessages) || 
                message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                message.member?.permissions.has(PermissionFlagsBits.MentionEveryone);

  if (!isMod) {
    const automod = guildSettings.automod || {};

    // 1. Anti-Everyone / Anti-Here / Unauthorized Mass Mentions (CRITICAL)
    const hasEveryoneMention = message.content.includes('@everyone') || message.content.includes('@here') || message.mentions.everyone;
    const hasMassMentions = (message.mentions.users?.size || 0) >= 4 || (message.mentions.roles?.size || 0) >= 3;

    if (hasEveryoneMention || hasMassMentions) {
      console.log(`[AutoMod] Caught unauthorized @everyone/mass mention from ${message.author.tag} in #${message.channel.name}`);
      await message.delete().catch(() => {});
      // Do NOT kick the member, but timeout for 10 minutes to prevent automated raid/compromised token spam
      await message.member?.timeout(10 * 60 * 1000, 'AutoMod: Unauthorized @everyone / mass mention spam').catch(() => {});
      const warnMsg = await message.channel.send(`🛡️ **AutoMod:** Unauthorized mass ping (\`@everyone\`) from ${message.author.toString()} was automatically deleted.`);
      setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
      return;
    }

    // 2. Anti-Crypto / Phishing / Scam Detection (CRITICAL)
    const contentLower = message.content.toLowerCase();
    const scamTerms = [
      'crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'airdrop', 'promo code', 'bonus code',
      'mrbeast', 'free nitro', 'claim nitro', 'steam gift', 'free robux',
      'withdrawal success', 'deposit bonus', 'wallet connect', 'doubler', 'rakeback'
    ];
    const hasScamWord = scamTerms.some(term => contentLower.includes(term));
    const hasAttachments = message.attachments && message.attachments.size > 0;

    if (hasScamWord && (hasAttachments || contentLower.includes('http') || contentLower.includes('bonus') || contentLower.includes('code') || contentLower.includes('claim'))) {
      console.log(`[AutoMod] Caught crypto/phishing scam from ${message.author.tag} in #${message.channel.name}`);
      await message.delete().catch(() => {});
      await message.member?.timeout(10 * 60 * 1000, 'AutoMod: Suspicious crypto scam/phishing').catch(() => {});
      const warnMsg = await message.channel.send(`🛡️ **AutoMod:** Deleted suspicious scam/phishing message from ${message.author.toString()}.`);
      setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
      return;
    }

    // 3. Anti-Discord Invites (Unapproved server advertising)
    const isDiscordInvite = message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/');
    if (isDiscordInvite) {
      await message.delete().catch(() => {});
      const warnMsg = await message.channel.send("⚠️ " + message.author.toString() + ", Discord server invites are not allowed here!");
      setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
      return;
    }

    // 4. Anti-Link (Phishing & General Links)
    if (automod.antiLink) {
      const isLink = message.content.includes('http://') || message.content.includes('https://');
      const isGif = message.content.includes('tenor.com') || message.content.includes('giphy.com');
      if (isLink && (!isGif || !isAiChannel)) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send("⚠️ " + message.author.toString() + ", links are not allowed here!");
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // 5. Bad Words Filter
    if (automod.badWords && automod.badWords.length > 0) {
      const hasBadWord = automod.badWords.some(word => contentLower.includes(word.toLowerCase()));
      if (hasBadWord) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send("⚠️ " + message.author.toString() + ", watch your language!");
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // 6. Anti-Caps Filter
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

    // 7. Anti-Spam Rate Limiter (Default active)
    if (automod.antiSpam !== false) {
      const now = Date.now();
      const userData = spamTracker.get(userId) || { count: 0, lastMsg: now };
      if (now - userData.lastMsg < 4000) {
        userData.count++;
        if (userData.count >= 4) {
          await message.delete().catch(() => {});
          await message.member?.timeout(5 * 60 * 1000, 'AutoMod: Rapid Spamming').catch(() => {});
          const warnMsg = await message.channel.send("🚫 " + message.author.toString() + " has been timed out for 5 minutes for rapid spamming.");
          setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
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



  // --- AUTO AI CHATBOT SYSTEM ---
  const isBotMentioned = message.mentions.has(client.user) && !message.mentions.everyone;

  if (isAiChannel || isBotMentioned) {
    if (channelMatchesAi && guildSettings.aiChatChannel !== message.channel.id) {
      db.updateGuild(guildId, { aiChatChannel: message.channel.id });
    }

    const cleanPrompt = message.content.replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '').trim();
    console.log(`[AI Triggered] Channel: #${message.channel.name} | User: ${message.author.username} | Message: "${cleanPrompt}"`);

    // Check if user sent a GIF, attachment, or text
    const hasGifOrAttachment = message.content.includes('tenor.com') ||
                               message.content.includes('giphy.com') ||
                               message.content.includes('.gif') ||
                               (message.attachments && message.attachments.size > 0) ||
                               (message.embeds && message.embeds.some(e => e.data?.type === 'gifv' || e.data?.thumbnail?.url?.includes('.gif')));

    if (cleanPrompt.length > 0 || hasGifOrAttachment) {
      await message.channel.sendTyping().catch(() => {});

      // Simulate natural human typing speed (1.2 to 2.2 seconds)
      await new Promise(res => setTimeout(res, 1200 + Math.random() * 1000));

      const reply = await getAiChatReply(message, cleanPrompt, message.author.username);
      if (reply) {
        return message.reply(reply).catch(() => {});
      }
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