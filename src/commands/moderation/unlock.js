import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Unlock the current channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null
    });
    return interaction.reply({ embeds: [successEmbed('Channel Unlocked ??', 'This channel is now unlocked.')] });
  } catch (err) {
    return interaction.reply({ embeds: [errorEmbed('Unlock Failed', 'Could not unlock channel.')], ephemeral: true });
  }
}
