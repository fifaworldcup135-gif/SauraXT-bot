import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { fetchLatestYouTubeVideo } from '../../utils/youtubeNotifier.js';

export const data = new SlashCommandBuilder()
  .setName('setyoutube')
  .setDescription('Configure 24/7 automated YouTube Live Stream & Video notifications')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt => opt.setName('channel_id_or_handle').setDescription('Your YouTube Channel ID (e.g. UC...) or Handle (e.g. @SAURAXT)').setRequired(true))
  .addChannelOption(opt => opt.setName('discord_channel').setDescription('Discord channel to send live stream alerts').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addRoleOption(opt => opt.setName('ping_role').setDescription('Role to mention when live (leave empty for @everyone)').setRequired(false))
  .addStringOption(opt => opt.setName('custom_message').setDescription('Custom alert message. Placeholders: {channelName}, {title}, {url}').setRequired(false));

export async function execute(interaction) {
  await interaction.deferReply();

  const identifier = interaction.options.getString('channel_id_or_handle').trim();
  const discordChannel = interaction.options.getChannel('discord_channel');
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
    pingRole: pingRole ? pingRole.id : null,
    customMessage: customMessage || '🔴 **{channelName} IS LIVE NOW!**\\n{url} 🎉',
    lastVideoId: latest.videoId
  };

  db.updateGuild(interaction.guildId, { youtube: youtubeConfig });

  return interaction.editReply({
    embeds: [
      successEmbed(
        'YouTube Notifications Active 🔴',
        'Successfully linked YouTube Channel: **' + latest.author + '** (`' + latest.channelId + '`)\\n\\n' +
        '📺 **Alerts Channel:** ' + discordChannel.toString() + '\\n' +
        '🔔 **Ping:** ' + (pingRole ? pingRole.toString() : '@everyone') + '\\n' +
        '🕒 **Latest Video/Stream Detected:** [' + latest.title + '](' + latest.url + ')\\n\\n' +
        'The bot will now poll YouTube 24/7 every 2 minutes and automatically announce all new live streams & uploads!'
      )
    ]
  });
}