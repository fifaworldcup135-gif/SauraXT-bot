import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setlevelchannel')
  .setDescription('Set the designated channel for level-up celebration alerts')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel for level notifications (leave empty to send in current channel)').addChannelTypes(ChannelType.GuildText).setRequired(false));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  db.updateGuild(interaction.guildId, { levelChannel: channel ? channel.id : null });

  if (channel) {
    return interaction.reply({ embeds: [successEmbed('Level Channel Configured', `Level up announcements will now be sent to ${channel}.`)] });
  } else {
    return interaction.reply({ embeds: [successEmbed('Level Channel Reset', 'Level up announcements will now be sent in the chat where the user reached the level.')] });
  }
}
