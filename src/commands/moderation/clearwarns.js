import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('clearwarns')
  .setDescription('Clear all warnings for a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(opt => opt.setName('target').setDescription('The member to clear warnings for').setRequired(true));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const count = db.clearWarnings(interaction.guildId, target.id);

  if (count === 0) {
    return interaction.reply({ embeds: [errorEmbed('No Warnings', `${target} has no warnings to clear.`)], ephemeral: true });
  }

  return interaction.reply({
    embeds: [successEmbed('Warnings Cleared', `Successfully cleared **${count}** warning(s) for ${target}.`)]
  });
}
