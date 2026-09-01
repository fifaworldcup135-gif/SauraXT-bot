import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  EmbedBuilder 
} from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';
import { successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('ticketsetup')
  .setDescription('Deploy the Expert Support Ticket Panel with Category Selector')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt => opt.setName('category').setDescription('Discord category for new tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(false))
  .addRoleOption(opt => opt.setName('support_role').setDescription('Role to ping for new tickets').setRequired(false));

export async function execute(interaction) {
  const category = interaction.options.getChannel('category');
  const supportRole = interaction.options.getRole('support_role');

  db.updateGuild(interaction.guildId, {
    ticketCategory: category ? category.id : null,
    ticketSupportRole: supportRole ? supportRole.id : null
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📩 SAURAXT KA server • Official Support Center')
    .setDescription(
      'Welcome to our 24/7 automated support hub!\\n\\n' +
      'To open a ticket, **select the category that matches your inquiry** from the dropdown menu below. Our AI Assistant and Staff Team will assist you immediately in a private channel.'
    )
    .addFields(
      { name: '💬 General Support', value: 'Questions about server perks, roles, and rules.', inline: true },
      { name: '🚨 Player Report', value: 'Report rule breakers, toxicity, or scams.', inline: true },
      { name: '🪙 Economy & Shop', value: 'Coins balance issues, casino, or shop purchases.', inline: true },
      { name: '🎥 YouTube & Collabs', value: 'Stream partnerships, clips, and collaborations.', inline: true },
      { name: '🐛 Bug Reports', value: 'Report bot glitches, errors, or suggestions.', inline: true },
      { name: '⚡ Instant AI Assistance', value: 'Immediate automated diagnostics upon creation.', inline: true }
    )
    .setFooter({ text: 'Official 24/7 Ticket System • SAURAXT KA server' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select_category')
    .setPlaceholder('👉 Choose a ticket category to get started...')
    .addOptions([
      { label: 'General Server Support', value: 'general', emoji: '💬', description: 'Ask questions or get help with server features' },
      { label: 'Report a Player / Scam', value: 'report', emoji: '🚨', description: 'Report a user for rule violations or scams' },
      { label: 'Economy & Shop Issues', value: 'economy', emoji: '🪙', description: 'Help with balance, casino bets, or shop items' },
      { label: 'YouTube & Collab Request', value: 'collab', emoji: '🎥', description: 'Live stream collabs, sponsorship, or media' },
      { label: 'Bug Report / Suggestions', value: 'bug', emoji: '🐛', description: 'Report technical errors or suggest new features' }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.channel.send({ embeds: [embed], components: [row] });
  return interaction.reply({
    embeds: [successEmbed('Expert Ticket Panel Deployed', 'The interactive category ticket panel is now live in this channel!')],
    ephemeral: true
  });
}