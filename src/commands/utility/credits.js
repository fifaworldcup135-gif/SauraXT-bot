import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const REPOSITORY_URL = 'https://github.com/Saura0S/sauraxt-discord-bot';

export const data = new SlashCommandBuilder()
  .setName('credits')
  .setDescription('Show bot development credits and GitHub repository');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('SauraXT Bot Credits')
    .setDescription('Built with high-performance Discord automation by the SauraXT Development Team.\n\nEnjoying SauraXT Bot? Consider starring the project!')
    .setColor('#6A5ACD')
    .setFooter({
      text: interaction.client.user?.username || 'SauraXT',
      iconURL: interaction.client.user?.displayAvatarURL() || undefined
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Star on GitHub ⭐').setStyle(ButtonStyle.Link).setURL(REPOSITORY_URL)
  );

  return interaction.reply({ embeds: [embed], components: [row] });
}
