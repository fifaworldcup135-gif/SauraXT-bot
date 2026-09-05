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

  const embed = musicManager.createNowPlayingEmbed(queue.currentTrack, queue.isPaused, queue.isLooping, queue);
  const components = musicManager.createControllerButtons(queue.isPaused, queue.isLooping, queue.currentTrack?.isVip, queue.previousTracks.length > 0);

  return interaction.reply({ embeds: [embed], components });
}