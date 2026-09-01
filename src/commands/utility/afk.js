import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('afk')
  .setDescription('Set your AFK status. Automatically notifies anyone who mentions you.')
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for going AFK').setRequired(false));

export async function execute(interaction) {
  const reason = interaction.options.getString('reason') || 'Away from keyboard';
  db.setAfk(interaction.guildId, interaction.user.id, reason);

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('?? AFK Status Enabled')
    .setDescription(`I set your AFK: **${reason}**\nI will notify anyone who mentions you, and remove your AFK when you chat next.`)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
