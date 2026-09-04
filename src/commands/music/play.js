import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';
import { db } from '../../database/db.js';

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
  const guildSettings = db.getGuild(interaction.guildId);

  try {
    const result = await musicManager.resolveAndPlay(voiceChannel, interaction.channel, rawQuery, interaction.member, guildSettings);

    if (result.status === 'queued') {
      const embed = new EmbedBuilder()
        .setColor(result.isVip ? '#FFD700' : config.colors.primary)
        .setTitle(result.isVip ? '👑 VIP Added to Queue (Position #' + result.position + ')' : '➕ Added to Queue (Position #' + result.position + ')')
        .setDescription('**[' + result.track.title + '](' + result.track.url + ')**')
        .setThumbnail(result.track.thumbnail)
        .addFields(
          { name: '👤 Artist / Channel', value: result.track.artist, inline: true },
          { name: '⏱️ Duration', value: result.track.duration, inline: true },
          { name: '🙋 Requested By', value: '<@' + interaction.user.id + '>' + (result.isVip ? ' ⭐ VIP Pass' : ''), inline: true }
        )
        .setFooter({ text: 'Use /queue to see upcoming tracks' });

      return interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(result.isVip ? '#FFD700' : config.colors.success)
        .setTitle(result.isVip ? '👑 VIP Lounge • Now Playing' : '🎵 Playing Track')
        .setDescription('**[' + result.track.title + '](' + result.track.url + ')** in **' + voiceChannel.name + '**')
        .setThumbnail(result.track.thumbnail)
        .addFields(
          { name: '👤 Artist', value: result.track.artist, inline: true },
          { name: '⏱️ Duration', value: result.track.duration, inline: true }
        );

      if (result.isVip) {
        embed.addFields(
          { name: '💎 VIP Privileges', value: 'Lossless 384kbps • Ultra HD Stream Active', inline: false }
        );
      }

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Play command error:', err.message);
    if (err.message.startsWith('VIP_RESTRICTED:')) {
      const vipEmbed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🔒 VIP Exclusive Lounge')
        .setDescription(err.message.replace('VIP_RESTRICTED: ', ''))
        .setFooter({ text: 'Upgrade to VIP / Boost Server to unlock VIP Lounge access!' });
      return interaction.editReply({ embeds: [vipEmbed] });
    }
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