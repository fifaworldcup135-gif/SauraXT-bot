import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Set or cycle loop mode (track, queue, or off)')
  .addStringOption(opt =>
    opt.setName('mode')
      .setDescription('Loop mode: track, queue, or off')
      .addChoices(
        { name: 'track', value: 'track' },
        { name: 'queue', value: 'queue' },
        { name: 'off', value: 'off' }
      )
  );

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);
  if (!queue.currentTrack) {
    return interaction.reply({ content: '❌ There is no music playing to loop!', ephemeral: true });
  }

  const requestedMode = interaction.options.getString('mode');
  let mode;

  if (requestedMode) {
    mode = requestedMode;
  } else {
    // Cycle: off -> track -> queue -> off
    if (!queue.isLooping && !queue.loopQueue) mode = 'track';
    else if (queue.isLooping) mode = 'queue';
    else mode = 'off';
  }

  if (mode === 'track') {
    queue.isLooping = true;
    queue.loopQueue = false;
  } else if (mode === 'queue') {
    queue.isLooping = false;
    queue.loopQueue = true;
  } else {
    queue.isLooping = false;
    queue.loopQueue = false;
  }

  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('⭐ Loop Mode')
    .setDescription(`Set loop mode to **${mode.charAt(0).toUpperCase() + mode.slice(1)}**`);

  return interaction.reply({ embeds: [embed] });
}