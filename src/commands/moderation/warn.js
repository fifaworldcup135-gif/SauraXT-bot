import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { errorEmbed, modEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Issue a formal warning to a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(opt => opt.setName('target').setDescription('The member to warn').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const reason = interaction.options.getString('reason');

  if (target.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn yourself!')], ephemeral: true });
  }

  const warning = db.addWarning(interaction.guildId, target.id, interaction.user.id, reason);
  const userWarnings = db.getWarnings(interaction.guildId, target.id);

  target.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⚠️ Warning Received in ' + interaction.guild.name)
        .setDescription('Reason: ' + reason + '\nTotal Warnings: ' + userWarnings.length)
        .setTimestamp()
    ]
  }).catch(() => {});

  const embed = modEmbed('WARN', target, interaction.user, reason, [
    { name: 'Total Warnings', value: String(userWarnings.length), inline: true },
    { name: 'Warning ID', value: '`' + warning.id + '`', inline: true }
  ]);

  await interaction.reply({ embeds: [embed] });
}
