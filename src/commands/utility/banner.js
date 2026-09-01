import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('banner')
  .setDescription('View the profile banner of a user')
  .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(false));

export async function execute(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const user = await interaction.client.users.fetch(target.id, { force: true });
  const bannerUrl = user.bannerURL({ dynamic: true, size: 2048 });

  if (!bannerUrl) {
    return interaction.reply({ content: `? ${user.username} does not have a custom profile banner.`, ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`?? ${user.username}'s Profile Banner`)
    .setImage(bannerUrl)
    .setDescription(`[Download Banner Link](${bannerUrl})`)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
