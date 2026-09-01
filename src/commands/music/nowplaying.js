import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Display information and controls for currently playing song');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack) {
    return interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'There is no music currently active.')], ephemeral: true });
  }

  const embed = musicManager.createNowPlayingEmbed(queue.currentTrack, queue.isPaused, queue.isLooping);
  const row = musicManager.createControllerButtons(queue.isPaused, queue.isLooping);

  return interaction.reply({ embeds: [embed], components: [row] });
}