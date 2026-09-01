import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('deposit').setDescription('Deposit into bank').addStringOption(opt => opt.setName('amount').setDescription('Amount or "all"').setRequired(true));
export async function execute(interaction) {
  const input = interaction.options.getString('amount').toLowerCase();
  const p = db.getUser(interaction.guildId, interaction.user.id);
  const w = p.wallet || 0, b = p.bank || 0, space = (p.bankCapacity || 5000) - b;
  let a = input === 'all' ? w : parseInt(input, 10);
  if (isNaN(a) || a <= 0) return interaction.reply({ content: '❌ Invalid amount.', ephemeral: true });
  if (a > w) return interaction.reply({ content: '❌ You only have ' + '\u0024' + formatNumber(w) + ' in wallet.', ephemeral: true });
  if (a > space) return interaction.reply({ content: '❌ Bank only has space for ' + '\u0024' + formatNumber(space) + ' more!', ephemeral: true });
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: w - a, bank: b + a });
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🏦 Deposit Successful').setDescription('Deposited **' + '\u0024' + formatNumber(a) + '** into bank.\nNew Bank Balance: **' + '\u0024' + formatNumber(b + a) + '**')] });
}
