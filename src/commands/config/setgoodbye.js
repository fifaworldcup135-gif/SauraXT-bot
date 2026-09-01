import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setgoodbye')
  .setDescription('Configure goodbye departure channel and custom message')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send goodbye messages').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addStringOption(opt => opt.setName('message').setDescription('Custom message. Variables: {user}, {tag}, {server}, {memberCount}').setRequired(false));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  const message = interaction.options.getString('message');

  const updates = { goodbyeChannel: channel.id };
  if (message) updates.goodbyeMessage = message;

  db.updateGuild(interaction.guildId, updates);

  return interaction.reply({
    embeds: [successEmbed('Goodbye Channel Updated', `Goodbye messages will be sent to ${channel}.`)]
  });
}
