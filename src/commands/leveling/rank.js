import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { calculateLevel, xpForLevel, progressBar, formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('rank').setDescription('View your or another member level, XP, and rank card').addUserOption(opt => opt.setName('target').setDescription('The member to check').setRequired(false));
export async function execute(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const profile = db.getUser(interaction.guildId, target.id);
  const currentXp = profile.xp || 0;
  const level = calculateLevel(currentXp);
  const currentLevelBaseXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const neededInLevel = nextLevelXp - currentLevelBaseXp;
  const progressInLevel = currentXp - currentLevelBaseXp;
  const allUsers = db.getLeaderboard(interaction.guildId, 'xp', 1000);
  const rankIndex = allUsers.findIndex(u => u.userId === target.id);
  const rankPos = rankIndex !== -1 ? rankIndex + 1 : allUsers.length + 1;
  const bar = progressBar(progressInLevel, neededInLevel, 14);
  const embed = new EmbedBuilder().setColor(config.colors.gold).setTitle('⭐ Level & Rank Status: ' + target.username).setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 })).addFields({ name: '🏆 Server Rank', value: '#' + rankPos, inline: true }, { name: '⭐ Level', value: String(level), inline: true }, { name: '💬 Total Messages', value: formatNumber(profile.messagesCount || 0), inline: true }, { name: '📊 XP Progress', value: formatNumber(progressInLevel) + ' / ' + formatNumber(neededInLevel) + ' XP (Total: ' + formatNumber(currentXp) + ')', inline: false }, { name: 'Progress Bar', value: bar, inline: false }).setFooter({ text: 'SAURAXT Leveling System' }).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
