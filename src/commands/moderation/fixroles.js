import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { secureServerRoles } from '../../utils/roleHardener.js';

export const data = new SlashCommandBuilder()
  .setName('fixroles')
  .setDescription('Professionally audit all roles and revoke @everyone & @here mention permissions from members')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const report = await secureServerRoles(interaction.guild, interaction.client);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🛡️ Professional Role & Mention Security Audit')
      .setDescription('Successfully audited and hardened role permissions across **' + interaction.guild.name + '**.')
      .addFields(
        {
          name: '🔒 Roles Secured (@everyone / @here Revoked)',
          value: report.securedRoles.length > 0
            ? report.securedRoles.map(r => '• `' + r + '`').join('\n')
            : '✅ All member roles already have `@everyone` mention permission disabled!',
          inline: false
        },
        {
          name: '💬 Channels Protected',
          value: report.securedChannels > 0
            ? 'Updated permission overrides across **' + report.securedChannels + '** text channels to deny `@everyone` pings.'
            : '✅ Channels already locked down.',
          inline: false
        },
        {
          name: '👑 Staff Roles Preserved',
          value: report.staffRoles.length > 0
            ? report.staffRoles.map(r => '• `' + r + '`').join('\n')
            : '*None detected.*',
          inline: false
        }
      )
      .setFooter({ text: 'Professional Gaming Server Security • No Regular Members Can Ping Everyone' })
      .setTimestamp();

    if (report.skippedRoles.length > 0) {
      embed.addFields({
        name: '⚠️ Skipped Roles (Role Position Higher than Bot)',
        value: report.skippedRoles.map(r => '• `' + r + '`').join('\n') + '\n*(Place the Bot\'s role higher in Server Settings > Roles to manage these)*',
        inline: false
      });
    }

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Error in fixroles command:', err);
    return interaction.editReply({ content: '❌ Failed to execute role audit: ' + err.message });
  }
}
