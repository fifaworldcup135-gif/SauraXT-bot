import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('rich').setDescription('View richest members');
export async function execute(interaction) {
  const leaders = db.getLeaderboard(interaction.guildId, 'economy', 10);
  if (leaders.length === 0) return interaction.reply({ content: 'No economy data yet.', ephemeral: true });
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  const desc = leaders.map((u, i) => medals[i] + ' <@' + u.userId + '> — **' + '\u0024' + formatNumber((u.wallet || 0) + (u.bank || 0)) + '** (Wallet: ' + '\u0024' + formatNumber(u.wallet || 0) + ' | Bank: ' + '\u0024' + formatNumber(u.bank || 0) + ')').join('\n\n');
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.gold).setTitle('💎 Richest Members Leaderboard').setDescription(desc).setFooter({ text: 'Rankings' })] });
}
