import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Adjust music playback volume')
  .addIntegerOption(opt => opt.setName('level').setDescription('Volume percentage (1-100)').setMinValue(1).setMaxValue(100).setRequired(true));

export async function execute(interaction) {
  const level = interaction.options.getInteger('level');
  const queue = musicManager.getQueue(interaction.guildId);
  queue.volume = level;

  return interaction.reply({ embeds: [successEmbed('Volume Updated 🔊', 'Playback volume set to **' + level + '%**.')] });
}