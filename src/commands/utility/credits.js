import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const REPOSITORY_URL = 'https://github.com/relentiousdragon/lunar-music';

export const data = new SlashCommandBuilder()
  .setName('credits')
  .setDescription('Show Lunar Music credits and original repository');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Lunar Music Credits')
    .setDescription('Created by [relentiousdragon](https://github.com/relentiousdragon).\n\nIf you liked this bot, consider starring the repository on GitHub.')
    .setColor('#6A5ACD')
    .setFooter({
      text: 'Lunar',
      iconURL: interaction.client.user?.displayAvatarURL() || undefined
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Star on GitHub ⭐').setStyle(ButtonStyle.Link).setURL(REPOSITORY_URL)
  );

  return interaction.reply({ embeds: [embed], components: [row] });
}
