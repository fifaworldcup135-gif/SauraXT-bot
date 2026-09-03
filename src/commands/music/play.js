import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play any song, track, or stream in your voice channel')
  .addStringOption(opt => opt.setName('query').setDescription('Song name, YouTube URL, or Spotify/SoundCloud link').setRequired(true));

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      embeds: [errorEmbed('Voice Channel Required', 'You must join a Voice Channel before using `/play`!')],
      ephemeral: true
    });
  }

  await interaction.deferReply();
  const rawQuery = interaction.options.getString('query');

  try {
    const result = await musicManager.resolveAndPlay(voiceChannel, interaction.channel, rawQuery, interaction.user);

    if (result.status === 'queued') {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('➕ Added to Queue (Position #' + result.position + ')')
            .setDescription('**[' + result.track.title + '](' + result.track.url + ')**')
            .setThumbnail(result.track.thumbnail)
            .addFields(
              { name: '👤 Artist / Channel', value: result.track.artist, inline: true },
              { name: '⏱️ Duration', value: result.track.duration, inline: true },
              { name: '🙋 Requested By', value: '<@' + interaction.user.id + '>', inline: true }
            )
            .setFooter({ text: 'Use /queue to see upcoming tracks' })
        ]
      });
    } else {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎵 Playing Track')
            .setDescription('**[' + result.track.title + '](' + result.track.url + ')** in **' + voiceChannel.name + '**')
            .setThumbnail(result.track.thumbnail)
            .addFields(
              { name: '👤 Artist', value: result.track.artist, inline: true },
              { name: '⏱️ Duration', value: result.track.duration, inline: true }
            )
        ]
      });
    }
  } catch (err) {
    console.error('Play command error:', err.message);
    if (err.message.startsWith('MISSING_PERMS:')) {
      return interaction.editReply({
        embeds: [errorEmbed('Voice Channel Permission Missing', err.message.replace('MISSING_PERMS: ', ''))]
      });
    }
    if (err.message.startsWith('NO_RESULTS:')) {
      return interaction.editReply({
        embeds: [errorEmbed('No Results Found', 'Could not find any music matching `' + rawQuery + '`. Try another song name!')]
      });
    }
    return interaction.editReply({
      embeds: [errorEmbed('Playback Error', 'An error occurred while loading this song.')]
    });
  }
}