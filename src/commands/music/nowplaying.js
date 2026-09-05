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

  const embed = await musicManager.createNowPlayingEmbed(queue.currentTrack, queue);
  return interaction.reply({ embeds: [embed] });
}