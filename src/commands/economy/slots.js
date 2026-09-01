import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
const symbols = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
export const data = new SlashCommandBuilder().setName('slots').setDescription('Spin slot machine').addIntegerOption(opt => opt.setName('bet').setDescription('Coins').setMinValue(10).setRequired(true));
export async function execute(interaction) {
  const bet = interaction.options.getInteger('bet');
  const p = db.getUser(interaction.guildId, interaction.user.id);
  if ((p.wallet || 0) < bet) return interaction.reply({ content: '❌ Not enough coins! (Wallet: ' + '\u0024' + formatNumber(p.wallet || 0) + ')', ephemeral: true });
  const s1 = symbols[Math.floor(Math.random() * symbols.length)];
  const s2 = symbols[Math.floor(Math.random() * symbols.length)];
  const s3 = symbols[Math.floor(Math.random() * symbols.length)];
  let mult = 0;
  if (s1 === s2 && s2 === s3) mult = s1 === '💎' ? 10 : s1 === '7️⃣' ? 7 : 4;
  else if (s1 === s2 || s2 === s3 || s1 === s3) mult = 1.5;
  const won = mult > 0;
  const payout = Math.floor(bet * mult);
  const newW = won ? p.wallet + (payout - bet) : p.wallet - bet;
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: newW });
  const embed = new EmbedBuilder().setColor(won ? config.colors.gold : config.colors.error).setTitle('🎰 CASINO SLOTS').setDescription('╔═══════════════╗\n   **[ ' + s1 + ' | ' + s2 + ' | ' + s3 + ' ]**\n╚═══════════════╝\n\n' + (won ? '🎉 **JACKPOT!** You won **' + '\u0024' + formatNumber(payout) + '** coins! (' + mult + 'x)' : '💀 **No match!** You lost **' + '\u0024' + formatNumber(bet) + '** coins.') + '\nNew Balance: **' + '\u0024' + formatNumber(newW) + '**').setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
