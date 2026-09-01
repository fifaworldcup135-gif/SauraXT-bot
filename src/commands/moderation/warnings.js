import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View all warnings for a member')
  .addUserOption(opt => opt.setName('target').setDescription('The member to check warnings for').setRequired(false));

export async function execute(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const warns = db.getWarnings(interaction.guildId, target.id);

  if (warns.length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🛡️ Warnings for ' + target.username)
          .setDescription(target.toString() + ' has a completely clean record! No warnings logged.')
      ]
    });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('⚠️ Warnings for ' + target.username + ' (' + warns.length + ' Total)')
    .setDescription(
      warns.map((w, index) => 
        '**' + (index + 1) + '.** ID: `' + w.id + '` | Mod: <@' + w.modId + '>\n**Reason:** ' + w.reason + '\n**Date:** <t:' + Math.floor(w.timestamp / 1000) + ':d>'
      ).join('\n\n')
    )
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
