import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('withdraw').setDescription('Withdraw from bank').addStringOption(opt => opt.setName('amount').setDescription('Amount or "all"').setRequired(true));
export async function execute(interaction) {
  const input = interaction.options.getString('amount').toLowerCase();
  const p = db.getUser(interaction.guildId, interaction.user.id);
  const w = p.wallet || 0, b = p.bank || 0;
  let a = input === 'all' ? b : parseInt(input, 10);
  if (isNaN(a) || a <= 0) return interaction.reply({ content: '❌ Invalid amount.', ephemeral: true });
  if (a > b) return interaction.reply({ content: '❌ You only have ' + '\u0024' + formatNumber(b) + ' in bank.', ephemeral: true });
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: w + a, bank: b - a });
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('💵 Withdrawal Successful').setDescription('Withdrew **' + '\u0024' + formatNumber(a) + '** into wallet.\nNew Wallet Balance: **' + '\u0024' + formatNumber(w + a) + '**')] });
}
