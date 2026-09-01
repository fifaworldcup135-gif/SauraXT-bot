import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('Set slowmode cooldown for the current channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode in seconds (0 to disable, max 21600)').setMinValue(0).setMaxValue(21600).setRequired(true));

export async function execute(interaction) {
  const seconds = interaction.options.getInteger('seconds');

  try {
    await interaction.channel.setRateLimitPerUser(seconds);
    if (seconds === 0) {
      return interaction.reply({ embeds: [successEmbed('Slowmode Disabled', 'Slowmode has been removed from this channel.')] });
    } else {
      return interaction.reply({ embeds: [successEmbed('Slowmode Enabled', `Slowmode set to **${seconds}s** per user.`)] });
    }
  } catch (err) {
    console.error('Slowmode error:', err);
    return interaction.reply({ embeds: [errorEmbed('Slowmode Error', 'Failed to update channel slowmode.')], ephemeral: true });
  }
}
