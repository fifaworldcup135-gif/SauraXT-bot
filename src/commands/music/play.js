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

    if (result.status === 'playing') {
      const embed = await musicManager.createNowPlayingEmbed(result.track, result.queue);
      return interaction.editReply({ embeds: [embed] });
    }

    const botName = interaction.client.user?.username || 'SauraXT';
    const botAvatar = interaction.client.user?.displayAvatarURL() || undefined;

    if (result.status === 'playing_playlist' || result.status === 'playlist') {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Added Playlist to Queue')
        .setDescription(`Added **${result.count}** tracks from **${result.name}**\n\n🎵 **Now Playing:** [${result.track.title}](${result.track.url})`)
        .setFooter({ text: botName, iconURL: botAvatar })
        .setTimestamp();
      if (result.track.thumbnail) embed.setThumbnail(result.track.thumbnail);
      return interaction.editReply({ embeds: [embed] });
    }

    if (result.status === 'queued') {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Added to Queue')
        .setDescription(`**[${result.track.title}](${result.track.url})**`)
        .addFields(
          { name: 'Duration', value: `\`${result.track.duration || 'HQ'}\``, inline: true },
          { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: botName, iconURL: botAvatar });
      if (result.track.thumbnail) embed.setThumbnail(result.track.thumbnail);
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