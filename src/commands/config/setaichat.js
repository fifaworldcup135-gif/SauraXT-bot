import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setaichat')
  .setDescription('Set a dedicated channel for 24/7 Auto AI Chatbot conversations')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel for AI Auto-Chat (leave empty to disable)').addChannelTypes(ChannelType.GuildText).setRequired(false));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  db.updateGuild(interaction.guildId, { aiChatChannel: channel ? channel.id : null });

  if (channel) {
    return interaction.reply({
      embeds: [
        successEmbed(
          'AI Auto-Chat Channel Enabled 🤖',
          'Members can now type anything in ' + channel.toString() + ' and the bot will automatically reply as an intelligent conversational AI!\\n\\n*(Note: Users can also talk to the bot anywhere by @mentioning it)*'
        )
      ]
    });
  } else {
    return interaction.reply({
      embeds: [successEmbed('AI Auto-Chat Channel Disabled', 'Dedicated AI channel disabled. The bot will still reply when @mentioned directly.')]
    });
  }
}