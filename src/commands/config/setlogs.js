import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setlogs')
  .setDescription('Set the server moderation audit logging channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel to receive audit log feeds').addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  db.updateGuild(interaction.guildId, { modLogChannel: channel.id });

  return interaction.reply({
    embeds: [successEmbed('Audit Logs Configured', `All moderation events, message edits/deletes, and member actions will be logged to ${channel}.`)]
  });
}
