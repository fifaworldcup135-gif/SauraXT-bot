import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
export const data = new SlashCommandBuilder().setName('userinfo').setDescription('Display comprehensive details about a server member').addUserOption(opt => opt.setName('target').setDescription('The member to inspect').setRequired(false));
export async function execute(interaction) {
  const user = interaction.options.getUser('target') || interaction.user;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const profile = db.getUser(interaction.guildId, user.id);
  const totalCoins = (profile.wallet || 0) + (profile.bank || 0);
  const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guildId).map(r => r.toString()).slice(0, 15).join(', ') || 'None' : 'Not in server';
  const embed = new EmbedBuilder().setColor(member?.displayColor || config.colors.primary).setTitle('👤 User Information: ' + user.tag).setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 })).addFields({ name: '🆔 User ID', value: '`' + user.id + '`', inline: true }, { name: '🤖 Account Type', value: user.bot ? 'Bot 🤖' : 'User 👤', inline: true }, { name: '⭐ Level & XP', value: 'Level ' + (profile.level || 1) + ' (' + formatNumber(profile.xp || 0) + ' XP)', inline: true }, { name: '📅 Created Date', value: '<t:' + Math.floor(user.createdTimestamp / 1000) + ':d> (<t:' + Math.floor(user.createdTimestamp / 1000) + ':R>)', inline: true }, { name: '📥 Joined Server', value: member ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':d> (<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>)' : 'N/A', inline: true }, { name: '💰 Net Worth', value: '$' + formatNumber(totalCoins), inline: true }, { name: '🎭 Server Roles (' + (member ? member.roles.cache.size - 1 : 0) + ')', value: roles, inline: false }).setFooter({ text: 'SAURAXT User Profile' }).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
