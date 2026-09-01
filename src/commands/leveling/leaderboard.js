import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('leaderboard').setDescription('View the top active members by XP and Level');
export async function execute(interaction) {
  const leaders = db.getLeaderboard(interaction.guildId, 'xp', 10);
  if (leaders.length === 0) return interaction.reply({ content: 'No leveling data recorded yet. Start chatting to gain XP!', ephemeral: true });
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  const desc = leaders.map((u, i) => medals[i] + ' <@' + u.userId + '> — **Level ' + (u.level || 1) + '** (' + formatNumber(u.xp || 0) + ' XP | ' + formatNumber(u.messagesCount || 0) + ' messages)').join('\n\n');
  const embed = new EmbedBuilder().setColor(config.colors.gold).setTitle('⭐ Server Leveling Leaderboard').setDescription(desc).setFooter({ text: 'Top 10 Most Active Chatters' }).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
