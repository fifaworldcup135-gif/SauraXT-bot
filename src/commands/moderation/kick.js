import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, modEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a member from the server')
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addUserOption(opt => opt.setName('target').setDescription('The member to kick').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (target.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot kick yourself!')], ephemeral: true });
  }

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return interaction.reply({ embeds: [errorEmbed('Not in Server', 'This user is not currently in the server.')], ephemeral: true });
  }

  if (!member.kickable) {
    return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'I cannot kick this member due to role hierarchy.')], ephemeral: true });
  }

  try {
    await member.kick(`${reason} (Kicked by ${interaction.user.tag})`);
    const embed = modEmbed('KICK', target, interaction.user, reason);
    await interaction.reply({ embeds: [embed] });

    const guildSettings = db.getGuild(interaction.guildId);
    if (guildSettings.modLogChannel) {
      const logChan = interaction.guild.channels.cache.get(guildSettings.modLogChannel);
      if (logChan) logChan.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('Kick error:', err);
    return interaction.reply({ embeds: [errorEmbed('Kick Failed', 'An error occurred while kicking the user.')], ephemeral: true });
  }
}
