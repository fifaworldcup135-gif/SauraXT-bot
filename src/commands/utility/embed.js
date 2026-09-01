import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('embed')
  .setDescription('Create a custom announcement embed in the channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption(opt => opt.setName('title').setDescription('Embed Title').setRequired(true))
  .addStringOption(opt => opt.setName('description').setDescription('Embed Description (Supports Markdown)').setRequired(true))
  .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. #5865F2, #FF0000)').setRequired(false))
  .addStringOption(opt => opt.setName('image_url').setDescription('Optional Image URL to attach').setRequired(false))
  .addStringOption(opt => opt.setName('footer').setDescription('Footer text').setRequired(false));

export async function execute(interaction) {
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description').replace(/\\n/g, '\n');
  const colorStr = interaction.options.getString('color');
  const imageUrl = interaction.options.getString('image_url');
  const footer = interaction.options.getString('footer');

  let color = config.colors.primary;
  if (colorStr) {
    const cleanHex = colorStr.replace('#', '');
    const parsed = parseInt(cleanHex, 16);
    if (!isNaN(parsed)) color = parsed;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  if (imageUrl && imageUrl.startsWith('http')) {
    embed.setImage(imageUrl);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  } else {
    embed.setFooter({ text: `Posted by ${interaction.user.tag}` });
  }

  await interaction.channel.send({ embeds: [embed] });
  return interaction.reply({ content: '? Embed created successfully!', ephemeral: true });
}
