import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../../database/db.js';
import { errorEmbed } from '../../utils/embeds.js';
import { fetchLatestYouTubeVideo } from '../../utils/youtubeNotifier.js';

export const data = new SlashCommandBuilder()
  .setName('testyoutube')
  .setDescription('Send a test YouTube Live Stream announcement to verify format')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply();

  const guildSettings = db.getGuild(interaction.guildId);
  const yt = guildSettings.youtube;

  if (!yt || !yt.channelId) {
    return interaction.editReply({
      embeds: [errorEmbed('Not Configured', 'YouTube alerts are not configured yet! Run `/setyoutube` first.')]
    });
  }

  const latest = await fetchLatestYouTubeVideo(yt.channelId);
  if (!latest) {
    return interaction.editReply({
      embeds: [errorEmbed('Fetch Failed', 'Could not retrieve YouTube data for test.')]
    });
  }

  const pingText = yt.pingRole ? '<@&' + yt.pingRole + '>' : '@everyone';
  const msgTemplate = yt.customMessage || '🔴 **{channelName} IS LIVE NOW!**\\n{url}';
  const formattedMessage = msgTemplate
    .replace(/{channelName}/g, latest.author)
    .replace(/{title}/g, latest.title)
    .replace(/{url}/g, latest.url);

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🔴 [TEST PREVIEW] ' + latest.title)
    .setURL(latest.url)
    .setAuthor({ name: latest.author + ' (YouTube Live Stream)', iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', url: latest.url })
    .setImage(latest.thumbnail)
    .addFields(
      { name: '📺 Channel', value: latest.author, inline: true },
      { name: '🔗 Direct Link', value: '[Click Here to Watch Stream](' + latest.url + ')', inline: true }
    )
    .setFooter({ text: 'Test YouTube Notification • SAURAXT KA server' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Watch Live Stream')
      .setStyle(ButtonStyle.Link)
      .setURL(latest.url)
      .setEmoji('▶️')
  );

  return interaction.editReply({
    content: '🔔 (Test Announcement) ' + pingText + ' ' + formattedMessage,
    embeds: [embed],
    components: [row]
  });
}