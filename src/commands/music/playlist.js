import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('playlist')
  .setDescription('Create and manage custom music playlists (Groove + Lunar feature)')
  .addSubcommand(sub =>
    sub.setName('save')
      .setDescription('Save the current playing queue as a custom playlist')
      .addStringOption(opt => opt.setName('name').setDescription('Name for your new playlist').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('load')
      .setDescription('Load and play a saved playlist into your voice channel')
      .addStringOption(opt => opt.setName('name').setDescription('Name of the playlist to load').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all your saved playlists')
  )
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete a saved playlist')
      .addStringOption(opt => opt.setName('name').setDescription('Name of the playlist to delete').setRequired(true))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildSettings = db.getGuild(interaction.guildId);

  // --- SUBCOMMAND: SAVE ---
  if (sub === 'save') {
    const name = interaction.options.getString('name').trim();
    const queue = musicManager.getQueue(interaction.guildId);

    const allTracks = [];
    if (queue.currentTrack) allTracks.push(queue.currentTrack);
    if (queue.queue && queue.queue.length > 0) {
      allTracks.push(...queue.queue);
    }

    if (allTracks.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed('Empty Queue', 'There are no active songs playing or queued to save as a playlist. Add songs with `/play` first!')],
        ephemeral: true
      });
    }

    const saved = db.savePlaylist(interaction.guildId, interaction.user.id, name, allTracks);

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('💾 Playlist Saved Successfully!')
      .setDescription(`Created playlist **${saved.name}** with **${saved.tracks.length}** tracks.`)
      .addFields(
        { name: '🎵 First Song', value: saved.tracks[0]?.title || 'Unknown', inline: true },
        { name: '📂 Total Tracks', value: `${saved.tracks.length}`, inline: true }
      )
      .setFooter({ text: `Load anytime with /playlist load name: ${saved.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // --- SUBCOMMAND: LOAD ---
  if (sub === 'load') {
    const name = interaction.options.getString('name').trim();
    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [errorEmbed('Voice Channel Required', 'You must join a Voice Channel to load a playlist!')],
        ephemeral: true
      });
    }

    const playlist = db.getPlaylist(interaction.guildId, interaction.user.id, name);
    if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed('Playlist Not Found', `No playlist named **${name}** was found. Use \`/playlist list\` to view your playlists.`)],
        ephemeral: true
      });
    }

    await interaction.deferReply();
    let loadedCount = 0;

    for (const track of playlist.tracks) {
      try {
        await musicManager.resolveAndPlay(voiceChannel, interaction.channel, track.url, interaction.member, guildSettings);
        loadedCount++;
      } catch (err) {
        console.error('Error enqueuing playlist track:', err.message);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📂 Playlist Loaded!')
      .setDescription(`Loaded **${loadedCount}** of **${playlist.tracks.length}** songs from playlist **${playlist.name}** into **${voiceChannel.name}**!`)
      .setFooter({ text: 'Use /queue to see the active playback list' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- SUBCOMMAND: LIST ---
  if (sub === 'list') {
    const playlists = db.getPlaylists(interaction.guildId, interaction.user.id);
    const names = Object.keys(playlists);

    if (names.length === 0) {
      return interaction.reply({
        embeds: [infoEmbed('No Playlists Found', 'You have not saved any custom playlists yet.\n\nPlay some songs and save them using `/playlist save <name>`!')],
        ephemeral: true
      });
    }

    const listText = names.map((key, i) => {
      const pl = playlists[key];
      const count = pl.tracks ? pl.tracks.length : 0;
      return `**${i + 1}.** 📁 **${pl.name}** — \`${count} songs\``;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`📁 Your Custom Playlists (${names.length})`)
      .setDescription(listText)
      .setFooter({ text: 'Load a playlist with /playlist load <name>' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // --- SUBCOMMAND: DELETE ---
  if (sub === 'delete') {
    const name = interaction.options.getString('name').trim();
    const deleted = db.deletePlaylist(interaction.guildId, interaction.user.id, name);

    if (!deleted) {
      return interaction.reply({
        embeds: [errorEmbed('Playlist Not Found', `No playlist named **${name}** was found to delete.`)],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [successEmbed('Playlist Deleted 🗑️', `Custom playlist **${name}** has been deleted.`)]
    });
  }
}
