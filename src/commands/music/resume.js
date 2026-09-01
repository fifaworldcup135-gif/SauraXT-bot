import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume paused music playback');

export async function execute(interaction) {
  const success = musicManager.resume(interaction.guildId);
  if (success) {
    return interaction.reply({ embeds: [successEmbed('Music Resumed ▶️', 'Playback continued!')] });
  } else {
    return interaction.reply({ embeds: [errorEmbed('Cannot Resume', 'Music is not paused or not playing.')], ephemeral: true });
  }
}