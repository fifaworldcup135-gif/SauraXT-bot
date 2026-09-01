import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, modEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';
export const data = new SlashCommandBuilder().setName('unban').setDescription('Unban a user by their ID').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addStringOption(opt => opt.setName('user_id').setDescription('The Discord User ID to unban').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason for the unban').setRequired(false));
export async function execute(interaction) {
  const userId = interaction.options.getString('user_id');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  try {
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return interaction.reply({ embeds: [errorEmbed('User Not Banned', 'No banned user found with ID `' + userId + '`.')], ephemeral: true });
    await interaction.guild.bans.remove(userId, reason);
    const embed = modEmbed('UNBAN', ban.user, interaction.user, reason);
    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    return interaction.reply({ embeds: [errorEmbed('Unban Failed', 'Failed to unban the user.')], ephemeral: true });
  }
}
