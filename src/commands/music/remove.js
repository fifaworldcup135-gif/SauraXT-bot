import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a specific track from the queue by its number')
  .addIntegerOption(opt =>
    opt.setName('position')
      .setDescription('The track number to remove (from /queue)')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const position = interaction.options.getInteger('position');
  const queue = musicManager.getQueue(interaction.guildId);

  if (queue.queue.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('Queue Empty', 'There are no upcoming songs in the queue.')],
      ephemeral: true
    });
  }

  if (position > queue.queue.length) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Position', `Position must be between 1 and ${queue.queue.length}. Check \`/queue\`.`)],
      ephemeral: true
    });
  }

  const removed = musicManager.removeTrack(interaction.guildId, position - 1);
  if (removed) {
    return interaction.reply({
      embeds: [successEmbed('Track Removed 🗑️', `Removed **[${removed.title}](${removed.url})** (Position #${position}) from the queue.`)]
    });
  } else {
    return interaction.reply({
      embeds: [errorEmbed('Removal Failed', 'Could not remove track at that position.')],
      ephemeral: true
    });
  }
}
