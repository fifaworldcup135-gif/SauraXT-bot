import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('autorole')
  .setDescription('Automatically assign a role to new members when they join')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addRoleOption(opt => opt.setName('role').setDescription('Role to automatically give (leave empty to disable)').setRequired(false));

export async function execute(interaction) {
  const role = interaction.options.getRole('role');
  db.updateGuild(interaction.guildId, { autoRoleId: role ? role.id : null });

  if (role) {
    return interaction.reply({ embeds: [successEmbed('Auto-Role Configured', `New members will automatically receive the ${role} role on join.`)] });
  } else {
    return interaction.reply({ embeds: [successEmbed('Auto-Role Disabled', 'Auto-role on join has been turned off.')] });
  }
}
