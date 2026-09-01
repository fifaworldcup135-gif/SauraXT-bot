import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import play from 'play-dl';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play any song, track, or stream in your voice channel')
  .addStringOption(opt => opt.setName('query').setDescription('Song name, YouTube, or SoundCloud link').setRequired(true));

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      embeds: [errorEmbed('Voice Channel Required', 'You must join a Voice Channel before using `/play`!')],
      ephemeral: true
    });
  }

  await interaction.deferReply();
  const query = interaction.options.getString('query');

  try {
    let track = null;

    // Search SoundCloud first for high-reliability unblocked audio streaming
    const scResults = await play.search(query, {
      source: { soundcloud: 'tracks' },
      limit: 1
    }).catch(() => []);

    if (scResults && scResults.length > 0) {
      const item = scResults[0];
      track = {
        title: item.name || item.title || query,
        url: item.url,
        duration: item.durationInSec ? Math.floor(item.durationInSec / 60) + ':' + (item.durationInSec % 60 < 10 ? '0' : '') + (item.durationInSec % 60) : 'HQ Audio',
        thumbnail: item.thumbnail,
        artist: item.user?.name || 'Artist',
        requestedBy: interaction.user.id
      };
    } else {
      // Fallback YouTube search
      const ytResults = await play.search(query, { limit: 1 }).catch(() => []);
      if (ytResults && ytResults.length > 0) {
        const item = ytResults[0];
        track = {
          title: item.title,
          url: item.url,
          duration: item.durationRaw,
          thumbnail: item.thumbnails[0]?.url,
          artist: item.channel?.name,
          requestedBy: interaction.user.id
        };
      }
    }

    if (!track) {
      return interaction.editReply({
        embeds: [errorEmbed('No Results Found', 'Could not find any playable music for `' + query + '`. Try another song name!')]
      });
    }

    const queue = await musicManager.connectVoice(voiceChannel, interaction.channel);

    if (queue.isPlaying) {
      queue.queue.push(track);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('➕ Added to Queue (Position #' + queue.queue.length + ')')
            .setDescription('**[' + track.title + '](' + track.url + ')**')
            .setThumbnail(track.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png')
            .addFields(
              { name: '⏱️ Duration', value: track.duration || 'HQ Audio', inline: true },
              { name: '👤 Artist', value: track.artist || 'Official Audio', inline: true }
            )
            .setFooter({ text: 'Use /queue to see upcoming songs' })
        ]
      });
    } else {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎵 Joining Voice & Playing Song')
            .setDescription('**[' + track.title + '](' + track.url + ')** in **' + voiceChannel.name + '**')
            .setThumbnail(track.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png')
        ]
      });

      musicManager.playTrack(interaction.guildId, track);
    }
  } catch (err) {
    console.error('Play command error:', err);
    return interaction.editReply({
      embeds: [errorEmbed('Playback Error', 'An error occurred while loading this song.')]
    });
  }
}