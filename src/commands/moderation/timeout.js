import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, modEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';
import ms from 'ms';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Mute / Timeout a member for a specified duration')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(opt => opt.setName('target').setDescription('The member to timeout').setRequired(true))
  .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 60s, 10m, 2h, 1d, 7d)').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for timeout').setRequired(false));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const durationStr = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return interaction.reply({ embeds: [errorEmbed('Not in Server', 'User not found in this server.')], ephemeral: true });
  }

  const durationMs = ms(durationStr);
  if (!durationMs || durationMs < 1000 || durationMs > 28 * 86400 * 1000) {
    return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Please provide a valid duration between 1 second and 28 days (e.g., 5m, 1h, 1d).')], ephemeral: true });
  }

  try {
    await member.timeout(durationMs, `${reason} (By ${interaction.user.tag})`);
    const embed = modEmbed('TIMEOUT', target, interaction.user, reason, [
      { name: 'Duration', value: durationStr, inline: true }
    ]);
    await interaction.reply({ embeds: [embed] });

    const guildSettings = db.getGuild(interaction.guildId);
    if (guildSettings.modLogChannel) {
      const logChan = interaction.guild.channels.cache.get(guildSettings.modLogChannel);
      if (logChan) logChan.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('Timeout error:', err);
    return interaction.reply({ embeds: [errorEmbed('Timeout Failed', 'Failed to timeout member. Check permissions & role hierarchy.')], ephemeral: true });
  }
}
