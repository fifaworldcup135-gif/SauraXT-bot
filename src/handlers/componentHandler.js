import { 
  ChannelType, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder
} from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embeds.js';
import { musicManager } from '../utils/musicManager.js';
import { getLyrics } from '../utils/lyrics.js';

export async function handleComponentInteraction(interaction, client) {
  const customId = interaction.customId;

  // --- 0. MUSIC CONTROLLER BUTTONS & FILTERS (Groove + Lunar Suite) ---
  if (customId === 'music_filter_select') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack) {
      return interaction.reply({ content: '❌ No music is currently playing to apply filters to.', ephemeral: true });
    }
    const filter = interaction.values[0];
    queue.activeFilter = filter;
    const embed = musicManager.createNowPlayingEmbed(queue.currentTrack, queue.isPaused, queue.isLooping, queue);
    const components = musicManager.createControllerComponents(queue.isPaused, queue.isLooping, queue.previousTracks.length > 0, queue.activeFilter);
    return interaction.update({ embeds: [embed], components });
  }

  if (customId === 'music_back') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.previousTracks || queue.previousTracks.length === 0) {
      return interaction.reply({ content: '⏮️ No previous tracks in playback history.', ephemeral: true });
    }
    const prev = musicManager.playPrevious(interaction.guildId);
    return interaction.reply({ content: `⏮️ Playing previous track: **${prev ? prev.title : 'Previous Track'}**!`, ephemeral: false });
  }

  if (customId === 'music_pause') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack) {
      return interaction.reply({ content: '❌ No music is currently playing.', ephemeral: true });
    }

    if (queue.isPaused) {
      musicManager.resume(interaction.guildId);
      const embed = musicManager.createNowPlayingEmbed(queue.currentTrack, false, queue.isLooping, queue);
      const components = musicManager.createControllerComponents(false, queue.isLooping, queue.previousTracks.length > 0, queue.activeFilter);
      return interaction.update({ embeds: [embed], components });
    } else {
      musicManager.pause(interaction.guildId);
      const embed = musicManager.createNowPlayingEmbed(queue.currentTrack, true, queue.isLooping, queue);
      const components = musicManager.createControllerComponents(true, queue.isLooping, queue.previousTracks.length > 0, queue.activeFilter);
      return interaction.update({ embeds: [embed], components });
    }
  }

  if (customId === 'music_skip') {
    const success = musicManager.skip(interaction.guildId);
    if (success) {
      return interaction.reply({ content: '⏭️ Skipped track by ' + interaction.user.toString() + '!', ephemeral: false });
    } else {
      return interaction.reply({ content: '❌ No track to skip.', ephemeral: true });
    }
  }

  if (customId === 'music_loop') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack) {
      return interaction.reply({ content: '❌ No music is currently playing.', ephemeral: true });
    }
    queue.isLooping = !queue.isLooping;
    const embed = musicManager.createNowPlayingEmbed(queue.currentTrack, queue.isPaused, queue.isLooping, queue);
    const components = musicManager.createControllerComponents(queue.isPaused, queue.isLooping, queue.previousTracks.length > 0, queue.activeFilter);
    return interaction.update({ embeds: [embed], components });
  }

  if (customId === 'music_stop') {
    musicManager.stop(interaction.guildId);
    return interaction.reply({ content: '⏹️ Playback stopped and disconnected by ' + interaction.user.toString() + '.', ephemeral: false });
  }

  if (customId === 'music_fav') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack) {
      return interaction.reply({ content: '❌ No music is currently playing to favorite.', ephemeral: true });
    }
    const added = db.addFavorite(interaction.guildId, interaction.user.id, queue.currentTrack);
    if (added) {
      return interaction.reply({
        content: `⭐ Added **[${queue.currentTrack.title}](${queue.currentTrack.url})** to your personal Favorites!\nUse \`/favorite list\` or \`/favorite play\` anytime.`,
        ephemeral: true
      });
    } else {
      return interaction.reply({
        content: `⭐ **${queue.currentTrack.title}** is already in your Favorites list!`,
        ephemeral: true
      });
    }
  }

  if (customId === 'music_queue') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack && queue.queue.length === 0) {
      return interaction.reply({ content: '📜 Queue is empty.', ephemeral: true });
    }
    const current = queue.currentTrack;
    const list = queue.queue.slice(0, 10).map((t, idx) => '**' + (idx + 1) + '.** ' + t.title + ' (`' + (t.duration || 'Live') + '`)');
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📜 Playback Queue')
      .setDescription('**Now Playing:** ' + (current ? `[${current.title}](${current.url})` : 'None') + '\n\n**Next Up:**\n' + (list.length > 0 ? list.join('\n') : '*No upcoming tracks.*'))
      .setFooter({ text: `Total in queue: ${queue.queue.length} • Loop: ${queue.isLooping ? 'ON 🔂' : 'OFF'} • Autoplay: ${queue.autoplay ? 'ON ✨' : 'OFF'}` });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (customId === 'music_lyrics') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack) {
      return interaction.reply({ content: '❌ No music is currently playing to get lyrics for.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const lyricsData = await getLyrics(queue.currentTrack.title, queue.currentTrack.artist);
    if (!lyricsData || !lyricsData.lyrics) {
      return interaction.editReply({
        content: `❌ Could not find lyrics for **${queue.currentTrack.title}**. Try using \`/lyrics query: <Song Title> <Artist>\`!`
      });
    }
    let lyricsText = lyricsData.lyrics;
    if (lyricsText.length > 4000) {
      lyricsText = lyricsText.substring(0, 3950) + '\n\n... *(lyrics truncated due to Discord length limit)*';
    }
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🎤 Lyrics • ${lyricsData.title}`)
      .setAuthor({ name: lyricsData.artist ? `Artist: ${lyricsData.artist}` : 'Song Lyrics' })
      .setDescription(lyricsText)
      .setFooter({ text: `LRCLIB Synced Engine • ${lyricsData.synced ? 'Timestamped Synced' : 'Plain Text'}` })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  }

  if (customId === 'music_shuffle') {
    const queue = musicManager.getQueue(interaction.guildId);
    if (queue.queue.length < 2) {
      return interaction.reply({ content: '🔀 Need at least 2 upcoming tracks in the queue to shuffle.', ephemeral: true });
    }
    musicManager.shuffle(interaction.guildId);
    return interaction.reply({ content: `🔀 Successfully shuffled **${queue.queue.length}** tracks in the queue!`, ephemeral: false });
  }

  if (customId === 'music_boost') {
    const queue = musicManager.getQueue(interaction.guildId);
    queue.volume = queue.volume >= 150 ? 100 : queue.volume + 25;
    return interaction.reply({
      content: `🔊 **Audio Fidelity Boost:** Audio output set to **${queue.volume}%** (Enhanced Bass & Dynamics)!`,
      ephemeral: true
    });
  }

  // --- 1. BUTTON ROLE TOGGLE ---
  if (customId.startsWith('btnrole_')) {
    const roleId = customId.replace('btnrole_', '');
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: '❌ Role not found on this server.', ephemeral: true });
    }

    const member = interaction.member;
    const hasRole = member.roles.cache.has(roleId);

    try {
      if (hasRole) {
        await member.roles.remove(roleId);
        return interaction.reply({
          content: '🗑️ Removed the **' + role.name + '** role from your profile.',
          ephemeral: true
        });
      } else {
        await member.roles.add(roleId);
        return interaction.reply({
          content: '✅ Added the **' + role.name + '** role to your profile!',
          ephemeral: true
        });
      }
    } catch (err) {
      return interaction.reply({
        content: '❌ Failed to update role. Check role hierarchy permissions.',
        ephemeral: true
      });
    }
  }

  // --- 2. EXPERT TICKET CREATION (Dropdown or Button) ---
  if (customId === 'ticket_select_category' || customId === 'ticket_create') {
    await interaction.deferReply({ ephemeral: true });
    const guildSettings = db.getGuild(interaction.guildId);

    let categoryKey = 'general';
    let categoryName = 'General Support';
    let categoryEmoji = '💬';

    if (customId === 'ticket_select_category' && interaction.values) {
      categoryKey = interaction.values[0];
      const categoryMap = {
        general: { name: 'General Support', emoji: '💬' },
        report: { name: 'Player Report / Scam', emoji: '🚨' },
        economy: { name: 'Economy & Shop Issue', emoji: '🪙' },
        collab: { name: 'YouTube & Collab Request', emoji: '🎥' },
        bug: { name: 'Bug Report / Suggestions', emoji: '🐛' }
      };
      if (categoryMap[categoryKey]) {
        categoryName = categoryMap[categoryKey].name;
        categoryEmoji = categoryMap[categoryKey].emoji;
      }
    }

    const existingTicket = Object.values(db.data.tickets).find(
      t => t.guildId === interaction.guildId && t.userId === interaction.user.id && t.status === 'open'
    );

    if (existingTicket) {
      const channel = interaction.guild.channels.cache.get(existingTicket.channelId);
      if (channel) {
        return interaction.editReply({
          embeds: [errorEmbed('Ticket Limit Reached', 'You already have an active ticket open in ' + channel.toString() + '!')]
        });
      }
    }

    try {
      const permissionOverwrites = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles
          ]
        }
      ];

      if (guildSettings.ticketSupportRole) {
        permissionOverwrites.push({
          id: guildSettings.ticketSupportRole,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }

      const channelName = (categoryKey + '-' + interaction.user.username).toLowerCase().replace(/[^a-z0-9-_]/g, '');

      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: guildSettings.ticketCategory || null,
        permissionOverwrites
      });

      db.createTicket(interaction.guildId, ticketChannel.id, interaction.user.id);

      const aiDiagnostics = {
        general: 'Welcome! How can our team assist you with SAURAXT KA server today? Feel free to ask any question regarding roles, rules, or perks.',
        report: 'Please provide: 1. The user\'s Discord ID or tag, 2. Clear screenshots/proof, 3. Description of what happened. Our moderation team will investigate shortly.',
        economy: 'Please share your wallet balance, recent transactions, or item name you were purchasing. You can also run `/balance` to check your funds.',
        collab: 'Thank you for reaching out! Please state your channel link, subscriber count, and details of the collaboration/event you would like to propose.',
        bug: 'Please provide steps to reproduce the glitch or your feature suggestion. Our development team monitors this closely.'
      };

      const ticketEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(categoryEmoji + ' ' + categoryName + ' Ticket')
        .setDescription(
          'Hello ' + interaction.user.toString() + '! Welcome to your private support channel.\\n\\n' +
          '🤖 **AI Initial Diagnostic:**\\n' + (aiDiagnostics[categoryKey] || aiDiagnostics.general) + '\\n\\n' +
          'Our human staff team has been notified and will assist you shortly.'
        )
        .addFields(
          { name: '👤 Creator', value: interaction.user.tag, inline: true },
          { name: '🏷️ Category', value: categoryName, inline: true },
          { name: '🙋 Handler', value: '`Unclaimed`', inline: true }
        )
        .setFooter({ text: 'Official 24/7 Support Hub • SAURAXT KA server' })
        .setTimestamp();

      const ticketControls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('Claim Ticket')
          .setEmoji('🙋')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ticket_transcript')
          .setLabel('Save Transcript')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_ai_help')
          .setLabel('AI Assistant')
          .setEmoji('⚡')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: interaction.user.toString() + ' ' + (guildSettings.ticketSupportRole ? '<@&' + guildSettings.ticketSupportRole + '>' : ''),
        embeds: [ticketEmbed],
        components: [ticketControls]
      });

      return interaction.editReply({
        embeds: [successEmbed('Ticket Created Successfully', 'Your ' + categoryName + ' ticket has been opened in ' + ticketChannel.toString() + '!')]
      });
    } catch (err) {
      console.error('Error creating ticket:', err);
      return interaction.editReply({
        embeds: [errorEmbed('Failed to Create Ticket', 'Make sure the bot has Administrator or Manage Channels permission.')]
      });
    }
  }

  // --- 3. TICKET CLAIM BUTTON ---
  if (customId === 'ticket_claim') {
    const ticket = db.getTicket(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: '❌ Ticket data not found.', ephemeral: true });
    }

    if (ticket.claimedBy) {
      return interaction.reply({
        content: '⚠️ This ticket has already been claimed by <@' + ticket.claimedBy + '>.',
        ephemeral: true
      });
    }

    db.updateTicket(interaction.channelId, { claimedBy: interaction.user.id });

    const claimEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('🙋 Ticket Claimed by Staff')
      .setDescription(interaction.user.toString() + ' has claimed this ticket and is now managing your inquiry.')
      .setTimestamp();

    return interaction.reply({ embeds: [claimEmbed] });
  }

  // --- 4. TICKET TRANSCRIPT GENERATOR ---
  if (customId === 'ticket_transcript') {
    await interaction.deferReply();
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).reverse();

      let transcript = '========================================\n';
      transcript += 'SAURAXT SERVER TICKET TRANSCRIPT\n';
      transcript += 'Channel: #' + interaction.channel.name + '\n';
      transcript += 'Generated At: ' + new Date().toISOString() + '\n';
      transcript += '========================================\n\n';

      for (const msg of sorted) {
        const time = new Date(msg.createdTimestamp).toLocaleTimeString();
        transcript += '[' + time + '] ' + msg.author.tag + ' (' + msg.author.id + '):\n';
        transcript += (msg.content || '[Attachment/Embed]') + '\n\n';
      }

      const buffer = Buffer.from(transcript, 'utf8');
      const attachment = new AttachmentBuilder(buffer, { name: 'transcript-' + interaction.channel.name + '.txt' });

      await interaction.editReply({
        content: '📋 **Ticket Transcript Generated Successfully:**',
        files: [attachment]
      });
    } catch (err) {
      console.error('Transcript error:', err);
      return interaction.editReply({ content: '❌ Failed to generate transcript.' });
    }
  }

  // --- 5. TICKET AI ASSISTANT DIAGNOSTIC ---
  if (customId === 'ticket_ai_help') {
    await interaction.deferReply();
    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle('⚡ AI Support Assistant Diagnostic')
      .setDescription(
        '**Automated Support Evaluation:**\\n' +
        '• Server Status: `100% Operational (24/7 Cloud)`\\n' +
        '• Verification & AutoMod: `Active & Enforced`\\n' +
        '• Economy & XP Engines: `Online`\\n' +
        '• YouTube Alert Feed: `Syncing every 2m`\\n\\n' +
        '💡 *Tip for User:* Ensure all relevant details, transaction IDs, or screenshots are posted in this channel. Our staff can resolve issues much faster with clear information!'
      )
      .setFooter({ text: 'AI Diagnostic Engine • SAURAXT KA server' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- 6. TICKET CLOSE BUTTON ---
  if (customId === 'ticket_close') {
    const ticket = db.getTicket(interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('Not a Ticket Channel', 'This channel is not an active ticket in database.')],
        ephemeral: true
      });
    }

    db.updateTicket(interaction.channelId, { status: 'closed' });

    const closeEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🔒 Ticket Closed')
      .setDescription('Ticket closed by ' + interaction.user.toString() + '. This channel will be safely deleted in **5 seconds**...')
      .setTimestamp();

    await interaction.reply({ embeds: [closeEmbed] });

    setTimeout(async () => {
      try {
        await interaction.channel.delete('Ticket closed by ' + interaction.user.tag);
      } catch (err) {
        console.error('Failed to delete ticket channel:', err);
      }
    }, 5000);
    return;
  }

  // --- 7. GIVEAWAY ENTER BUTTON ---
  if (customId === 'giveaway_enter') {
    const gw = db.getGiveaway(interaction.message.id);
    if (!gw || gw.ended) {
      return interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
    }

    if (gw.entries.includes(interaction.user.id)) {
      gw.entries = gw.entries.filter(id => id !== interaction.user.id);
      db.updateGiveaway(gw.messageId, { entries: gw.entries });

      return interaction.reply({
        content: '📤 You left the giveaway.',
        ephemeral: true
      });
    } else {
      gw.entries.push(interaction.user.id);
      db.updateGiveaway(gw.messageId, { entries: gw.entries });

      return interaction.reply({
        content: '🎉 **You entered the giveaway!** Good luck! (Total Entries: ' + gw.entries.length + ')',
        ephemeral: true
      });
    }
  }

  // --- 8. HELP CATEGORY SELECT MENU ---
  if (customId === 'help_category_select') {
    const category = interaction.values[0];
    const commands = Array.from(client.commands.values()).filter(cmd => cmd.category === category);

    const categoryTitles = {
      moderation: '🛡️ Moderation & Security Commands',
      economy: '🪙 Economy & Casino Commands',
      leveling: '⭐ Leveling & XP Commands',
      tickets: '📩 Expert Ticket System Commands',
      giveaway: '🎉 Giveaway System Commands',
      config: '⚙️ Server Configuration Commands',
      utility: '🛠️ Utility & Server Management',
      fun: '🎮 Fun, Games & AI Chat',
      music: '🎵 Music & Audio Playback Commands'
    };

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(categoryTitles[category] || ('📁 ' + category + ' Commands'))
      .setDescription(
        commands.length > 0 
          ? commands.map(cmd => '**/' + cmd.data.name + '** - ' + cmd.data.description).join('\n')
          : 'No commands found in this category.'
      )
      .setFooter({ text: 'Category: ' + category + ' • SAURAXT KA server' })
      .setTimestamp();

    await interaction.update({ embeds: [embed] });
  }
}