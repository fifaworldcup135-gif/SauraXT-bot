import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Lock the current channel to prevent members from sending messages')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false
    });
    return interaction.reply({ embeds: [successEmbed('Channel Locked ??', 'This channel is now locked. Regular members cannot send messages.')] });
  } catch (err) {
    return interaction.reply({ embeds: [errorEmbed('Lock Failed', 'Could not lock channel.')], ephemeral: true });
  }
}
