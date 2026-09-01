import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the currently playing track');

export async function execute(interaction) {
  const success = musicManager.skip(interaction.guildId);
  if (success) {
    return interaction.reply({ embeds: [successEmbed('Track Skipped ⏭️', 'Skipping to the next song in queue...')] });
  } else {
    return interaction.reply({ embeds: [errorEmbed('Nothing to Skip', 'No music is currently playing.')], ephemeral: true });
  }
}