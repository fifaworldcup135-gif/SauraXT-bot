import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import play from 'play-dl';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play any song, track, or stream in your voice channel')
  .addStringOption(opt => opt.setName('query').setDescription('Song name, YouTube URL, or playlist').setRequired(true));

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
    let searchResults = [];

    if (query.startsWith('http')) {
      const info = await play.video_info(query).catch(() => null);
      if (info) {
        searchResults.push({
          title: info.video_details.title,
          url: info.video_details.url,
          duration: info.video_details.durationRaw,
          thumbnail: info.video_details.thumbnails[0]?.url,
          channel: info.video_details.channel?.name
        });
      }
    } else {
      const results = await play.search(query, { limit: 1 });
      if (results && results.length > 0) {
        const item = results[0];
        searchResults.push({
          title: item.title,
          url: item.url,
          duration: item.durationRaw,
          thumbnail: item.thumbnails[0]?.url,
          channel: item.channel?.name
        });
      }
    }

    if (searchResults.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed('No Results Found', 'Could not find any music for `' + query + '`. Try a different song name or direct link.')]
      });
    }

    const track = {
      ...searchResults[0],
      requestedBy: interaction.user.id
    };

    const queue = await musicManager.connectVoice(voiceChannel, interaction.channel);

    if (queue.isPlaying) {
      queue.queue.push(track);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('➕ Added to Queue (Position #' + queue.queue.length + ')')
            .setDescription('**[' + track.title + '](' + track.url + ')**')
            .setThumbnail(track.thumbnail)
            .addFields(
              { name: '⏱️ Duration', value: track.duration || 'Live', inline: true },
              { name: '👤 Channel', value: track.channel || 'Unknown', inline: true }
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
            .setDescription('**[' + track.title + '](' + track.url + ')** in ' + voiceChannel.name)
            .setThumbnail(track.thumbnail)
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