import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { fetchLatestYouTubeVideo } from '../../utils/youtubeNotifier.js';

export const data = new SlashCommandBuilder()
  .setName('setyoutube')
  .setDescription('Configure 24/7 automated YouTube Live Stream & Video notifications')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt => opt.setName('discord_channel').setDescription('Channel for video uploads (e.g. #youtube)').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addStringOption(opt => opt.setName('channel_id_or_handle').setDescription('YouTube Channel ID or Handle (default: @sauraXT)').setRequired(false))
  .addChannelOption(opt => opt.setName('stream_channel').setDescription('Separate channel for live streams (e.g. #streaming)').addChannelTypes(ChannelType.GuildText).setRequired(false))
  .addRoleOption(opt => opt.setName('ping_role').setDescription('Role to mention (leave empty for @everyone)').setRequired(false))
  .addStringOption(opt => opt.setName('custom_message').setDescription('Custom message. Placeholders: {channelName}, {title}, {url}').setRequired(false));

export async function execute(interaction) {
  await interaction.deferReply();

  const identifier = (interaction.options.getString('channel_id_or_handle') || '@sauraXT').trim();
  const discordChannel = interaction.options.getChannel('discord_channel');
  const streamChannel = interaction.options.getChannel('stream_channel');
  const pingRole = interaction.options.getRole('ping_role');
  const customMessage = interaction.options.getString('custom_message');

  const latest = await fetchLatestYouTubeVideo(identifier);
  if (!latest) {
    return interaction.editReply({
      embeds: [errorEmbed('YouTube Channel Not Found', 'Could not fetch YouTube feed for `' + identifier + '`. Make sure the Channel ID (starts with UC...) or @handle is valid and public.')]
    });
  }

  const youtubeConfig = {
    channelId: latest.channelId,
    channelHandle: identifier,
    discordChannelId: discordChannel.id,
    videoChannelId: discordChannel.id,
    streamChannelId: streamChannel ? streamChannel.id : discordChannel.id,
    pingRole: pingRole ? pingRole.id : null,
    customMessage: customMessage || null,
    lastVideoId: latest.videoId,
    postedVideoIds: [latest.videoId]
  };

  db.updateGuild(interaction.guildId, { youtube: youtubeConfig });

  return interaction.editReply({
    embeds: [
      successEmbed(
        'YouTube Notifications Active 🔴',
        'Successfully linked YouTube Channel: **' + latest.author + '** (`' + latest.channelId + '`)\n\n' +
        '📺 **Videos Channel:** ' + discordChannel.toString() + '\n' +
        (streamChannel ? '🔴 **Live Stream Channel:** ' + streamChannel.toString() + '\n' : '') +
        '🔔 **Ping:** ' + (pingRole ? pingRole.toString() : '@everyone') + '\n' +
        '🕒 **Latest Video Detected:** [' + latest.title + '](' + latest.url + ')\n\n' +
        'The bot will now poll YouTube 24/7 every 60 seconds and automatically announce all new video uploads and live streams!'
      )
    ]
  });
}