import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Toggle loop mode for currently playing song');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);
  queue.isLooping = !queue.isLooping;

  return interaction.reply({
    embeds: [
      successEmbed(
        'Loop Mode ' + (queue.isLooping ? 'Enabled 🔁' : 'Disabled ➡️'),
        'Current track looping is now **' + (queue.isLooping ? 'ON' : 'OFF') + '**.'
      )
    ]
  });
}