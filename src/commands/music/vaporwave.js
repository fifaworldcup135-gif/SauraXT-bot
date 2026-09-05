import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('vaporwave')
  .setDescription('Toggle Vaporwave audio filter (Speed & Pitch x0.85)');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack) {
    return interaction.reply({
      embeds: [errorEmbed('Nothing Playing', 'Start something first before toggling Vaporwave!')],
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

  const isEnabled = queue.activeFilter !== 'vaporwave';
  queue.activeFilter = isEnabled ? 'vaporwave' : 'none';

  const embed = new EmbedBuilder()
    .setTitle(`▶️ Vaporwave ${isEnabled ? 'Enabled' : 'Disabled'}`)
    .setDescription(`Vaporwave filter has been **${isEnabled ? 'enabled' : 'disabled'}**.`)
    .setColor(isEnabled ? '#00FF00' : '#FF0000')
    .setFooter({ text: 'Lunar' });

  return interaction.reply({ embeds: [embed] });
}
