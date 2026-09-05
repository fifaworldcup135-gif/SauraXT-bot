import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('move')
  .setDescription('Move a song to a different position in the queue')
  .addIntegerOption(opt =>
    opt.setName('from')
      .setDescription('Current position of the song in /queue')
      .setRequired(true)
      .setMinValue(1)
  )
  .addIntegerOption(opt =>
    opt.setName('to')
      .setDescription('Target position in the queue')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const from = interaction.options.getInteger('from');
  const to = interaction.options.getInteger('to');
  const queue = musicManager.getQueue(interaction.guildId);

  if (queue.queue.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('Queue Empty', 'There are no upcoming songs in the queue to move.')],
      ephemeral: true
    });
  }

  if (from > queue.queue.length || to > queue.queue.length) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Positions', `Both positions must be between 1 and ${queue.queue.length}. Check \`/queue\`.`)],
      ephemeral: true
    });
  }

  const movedTrack = queue.queue[from - 1];
  const success = musicManager.moveTrack(interaction.guildId, from - 1, to - 1);

  if (success) {
    return interaction.reply({
      embeds: [successEmbed('Track Moved 🔀', `Moved **${movedTrack.title}** from position **#${from}** to **#${to}** in the queue.`)]
    });
  } else {
    return interaction.reply({
      embeds: [errorEmbed('Move Failed', 'Could not move the track.')],
      ephemeral: true
    });
  }
}
