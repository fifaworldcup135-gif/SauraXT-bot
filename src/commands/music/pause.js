import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause current music playback');

export async function execute(interaction) {
  const success = musicManager.pause(interaction.guildId);
  if (success) {
    return interaction.reply({ embeds: [successEmbed('Music Paused ⏸️', 'Playback has been paused. Use `/resume` to continue.')] });
  } else {
    return interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'No music is currently active to pause.')], ephemeral: true });
  }
}