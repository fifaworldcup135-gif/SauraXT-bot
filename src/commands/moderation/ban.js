import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, modEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a member from the server')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption(opt => opt.setName('target').setDescription('The member to ban').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
  .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of message history to delete (0-7)').setMinValue(0).setMaxValue(7).setRequired(false));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') || 0;

  if (target.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot ban yourself!')], ephemeral: true });
  }

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (member) {
    if (!member.bannable) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'I cannot ban this user because their role is higher or equal to mine.')], ephemeral: true });
    }
  }

  try {
    await interaction.guild.bans.create(target.id, {
      reason: `${reason} (Banned by ${interaction.user.tag})`,
      deleteMessageSeconds: deleteDays * 86400
    });

    const embed = modEmbed('BAN', target, interaction.user, reason, [
      { name: 'Deleted Messages', value: `${deleteDays} days`, inline: true }
    ]);

    await interaction.reply({ embeds: [embed] });

    // Mod log
    const guildSettings = db.getGuild(interaction.guildId);
    if (guildSettings.modLogChannel) {
      const logChan = interaction.guild.channels.cache.get(guildSettings.modLogChannel);
      if (logChan) logChan.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('Ban error:', err);
    return interaction.reply({ embeds: [errorEmbed('Ban Failed', 'An error occurred while banning the user.')], ephemeral: true });
  }
}
