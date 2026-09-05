import { SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('back')
  .setDescription('Play the previous track from history (Lunar feature)');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (queue.previousTracks.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('No History', 'There are no previous tracks in the history for this session.')],
      ephemeral: true
    });
  }

  const prev = musicManager.playPrevious(interaction.guildId);
  if (prev) {
    return interaction.reply({
      embeds: [successEmbed('Playing Previous Track ⏮️', `Rewinding back to **[${prev.title}](${prev.url})**!`)]
    });
  } else {
    return interaction.reply({
      embeds: [errorEmbed('Failed', 'Could not play previous track.')],
      ephemeral: true
    });
  }
}
