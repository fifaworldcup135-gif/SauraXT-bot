import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('nightcore')
  .setDescription('Toggle Nightcore audio filter (Speed & Pitch x1.15)');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack) {
    return interaction.reply({
      embeds: [errorEmbed('Nothing Playing', 'Start something first before toggling Nightcore!')],
      ephemeral: true
    });
  }

  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
    return interaction.reply({
      embeds: [errorEmbed('Permission Denied', 'You must be in the same voice channel as the bot!')],
      ephemeral: true
    });
  }

  const isEnabled = queue.activeFilter !== 'nightcore';
  queue.activeFilter = isEnabled ? 'nightcore' : 'none';

  const embed = new EmbedBuilder()
    .setTitle(`▶️ Nightcore ${isEnabled ? 'Enabled' : 'Disabled'}`)
    .setDescription(`Nightcore filter has been **${isEnabled ? 'enabled' : 'disabled'}**.`)
    .setColor(isEnabled ? '#00FF00' : '#FF0000')
    .setFooter({ text: 'Lunar' });

  return interaction.reply({ embeds: [embed] });
}
