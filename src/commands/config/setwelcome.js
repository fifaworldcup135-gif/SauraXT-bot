import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setwelcome')
  .setDescription('Configure welcome greeting channel and custom message')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send welcome embeds').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addStringOption(opt => opt.setName('message').setDescription('Custom message. Variables: {user}, {tag}, {server}, {memberCount}').setRequired(false));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  const message = interaction.options.getString('message');

  const updates = { welcomeChannel: channel.id };
  if (message) updates.welcomeMessage = message;

  db.updateGuild(interaction.guildId, updates);

  return interaction.reply({
    embeds: [successEmbed('Welcome Channel Updated', `Welcome messages will be sent to ${channel}.\n**Message Template:** \`${updates.welcomeMessage || 'Default Template'}\``)]
  });
}
