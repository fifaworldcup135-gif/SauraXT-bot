import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('coinflip').setDescription('Bet coins on a 50/50 coin flip').addStringOption(opt => opt.setName('choice').setDescription('Heads or Tails').setRequired(true).addChoices({ name: 'Heads 🪙', value: 'heads' }, { name: 'Tails 🪙', value: 'tails' })).addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setMinValue(10).setRequired(true));
export async function execute(interaction) {
  const choice = interaction.options.getString('choice');
  const bet = interaction.options.getInteger('bet');
  const p = db.getUser(interaction.guildId, interaction.user.id);
  if ((p.wallet || 0) < bet) return interaction.reply({ content: '❌ Not enough coins! (Wallet: ' + '\u0024' + formatNumber(p.wallet || 0) + ')', ephemeral: true });
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = choice === result;
  const newW = won ? p.wallet + bet : p.wallet - bet;
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: newW });
  const embed = new EmbedBuilder().setColor(won ? config.colors.success : config.colors.error).setTitle(won ? '🎉 Coinflip Winner!' : '💀 Coinflip Lost!').setDescription('The coin landed on **' + result.toUpperCase() + '**!\n\n' + (won ? 'You won **+' + '\u0024' + formatNumber(bet) + '** coins!' : 'You lost **-' + '\u0024' + formatNumber(bet) + '** coins.') + '\nNew Balance: **' + '\u0024' + formatNumber(newW) + '**').setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
