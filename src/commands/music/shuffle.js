import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Randomly shuffle the upcoming songs in the queue');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack && queue.queue.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('Empty Queue', 'There are no songs in the queue to shuffle.')],
      ephemeral: true
    });
  }

  if (queue.queue.length < 2) {
    return interaction.reply({
      embeds: [errorEmbed('Not Enough Tracks', 'You need at least 2 upcoming tracks in the queue to shuffle.')],
      ephemeral: true
    });
  }

  const success = musicManager.shuffle(interaction.guildId);
  if (success) {
    return interaction.reply({
      embeds: [successEmbed('Queue Shuffled 🔀', `Successfully randomized **${queue.queue.length}** upcoming tracks in the queue!`)]
    });
  } else {
    return interaction.reply({
      embeds: [errorEmbed('Shuffle Failed', 'Could not shuffle the queue.')],
      ephemeral: true
    });
  }
}
