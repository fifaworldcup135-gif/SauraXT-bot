import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('View the high-resolution avatar of a user')
  .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser('target') || interaction.user;
  const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 2048 });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`??? ${user.username}'s Avatar`)
    .setImage(avatarUrl)
    .setDescription(`[Download Avatar Link](${avatarUrl})`)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
