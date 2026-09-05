import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear all upcoming tracks from the playback queue');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (queue.queue.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('Queue Empty', 'There are no upcoming songs to clear in the queue.')],
      ephemeral: true
    });
  }

  const count = musicManager.clearQueue(interaction.guildId);
  return interaction.reply({
    embeds: [successEmbed('Queue Cleared 🧹', `Removed **${count}** upcoming songs from the playback queue.`)]
  });
}
