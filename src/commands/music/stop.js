import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop music playback, clear queue, and leave voice channel');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);
  if (!queue.connection && !queue.isPlaying) {
    return interaction.reply({ embeds: [errorEmbed('Not in Voice', 'The bot is not currently in a voice channel.')], ephemeral: true });
  }

  musicManager.stop(interaction.guildId);
  return interaction.reply({ embeds: [successEmbed('Playback Stopped ⏹️', 'Queue cleared and disconnected from voice channel.')] });
}