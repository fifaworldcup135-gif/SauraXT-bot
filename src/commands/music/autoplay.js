import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';

export const data = new SlashCommandBuilder()
  .setName('autoplay')
  .setDescription('Toggle automatic song discovery when the queue ends');

export async function execute(interaction) {
  const isEnabled = musicManager.toggleAutoplay(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(isEnabled ? '#5865F2' : '#99AAB5')
    .setTitle(isEnabled ? '✨ Autoplay Enabled' : '⏸️ Autoplay Disabled')
    .setDescription(
      isEnabled
        ? 'SauraXT will automatically search and play similar high-quality tracks whenever the current queue ends.'
        : 'Playback will naturally conclude and stop when the current queue finishes.'
    )
    .setFooter({ text: 'SauraXT Autoplay Engine', iconURL: interaction.client.user?.displayAvatarURL() || undefined })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
