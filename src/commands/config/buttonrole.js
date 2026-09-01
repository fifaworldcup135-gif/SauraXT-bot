import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../../config.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('buttonrole')
  .setDescription('Create an interactive Button Role panel for members to claim roles')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(opt => opt.setName('title').setDescription('Panel Title (e.g. Stream & Notification Roles)').setRequired(true))
  .addStringOption(opt => opt.setName('description').setDescription('Panel Description').setRequired(true))
  .addRoleOption(opt => opt.setName('role1').setDescription('First Role').setRequired(true))
  .addStringOption(opt => opt.setName('label1').setDescription('Label for button 1').setRequired(true))
  .addRoleOption(opt => opt.setName('role2').setDescription('Second Role').setRequired(false))
  .addStringOption(opt => opt.setName('label2').setDescription('Label for button 2').setRequired(false))
  .addRoleOption(opt => opt.setName('role3').setDescription('Third Role').setRequired(false))
  .addStringOption(opt => opt.setName('label3').setDescription('Label for button 3').setRequired(false));

export async function execute(interaction) {
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description').replace(/\\n/g, '\n');

  const r1 = interaction.options.getRole('role1');
  const l1 = interaction.options.getString('label1');

  const r2 = interaction.options.getRole('role2');
  const l2 = interaction.options.getString('label2');

  const r3 = interaction.options.getRole('role3');
  const l3 = interaction.options.getString('label3');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btnrole_' + r1.id)
      .setLabel(l1)
      .setStyle(ButtonStyle.Primary)
  );

  if (r2 && l2) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('btnrole_' + r2.id)
        .setLabel(l2)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (r3 && l3) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('btnrole_' + r3.id)
        .setLabel(l3)
        .setStyle(ButtonStyle.Success)
    );
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎭 ' + title)
    .setDescription(description + '\n\n*Click the buttons below to add or remove roles from your profile!*')
    .setFooter({ text: 'Self-Assignable Roles • SAURAXT KA server' })
    .setTimestamp();

  await interaction.channel.send({ embeds: [embed], components: [row] });
  return interaction.reply({ embeds: [successEmbed('Button Role Panel Created', 'The button role panel has been published!')], ephemeral: true });
}