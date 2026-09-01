import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, modEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription('Remove timeout / unmute a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(opt => opt.setName('target').setDescription('The member to remove timeout from').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for removing timeout').setRequired(false));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return interaction.reply({ embeds: [errorEmbed('Not in Server', 'User not found in this server.')], ephemeral: true });
  }

  try {
    await member.timeout(null, `${reason} (By ${interaction.user.tag})`);
    const embed = modEmbed('UNTIMEOUT', target, interaction.user, reason);
    await interaction.reply({ embeds: [embed] });

    const guildSettings = db.getGuild(interaction.guildId);
    if (guildSettings.modLogChannel) {
      const logChan = interaction.guild.channels.cache.get(guildSettings.modLogChannel);
      if (logChan) logChan.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('Untimeout error:', err);
    return interaction.reply({ embeds: [errorEmbed('Untimeout Failed', 'Failed to remove timeout from member.')], ephemeral: true });
  }
}
