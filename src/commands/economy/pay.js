import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('pay').setDescription('Transfer coins').addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true));
export async function execute(interaction) {
  const target = interaction.options.getUser('target'), amount = interaction.options.getInteger('amount');
  if (target.id === interaction.user.id || target.bot) return interaction.reply({ content: '❌ Invalid recipient.', ephemeral: true });
  const s = db.getUser(interaction.guildId, interaction.user.id), r = db.getUser(interaction.guildId, target.id);
  if ((s.wallet || 0) < amount) return interaction.reply({ content: '❌ Not enough coins! (Wallet: ' + '\u0024' + formatNumber(s.wallet || 0) + ')', ephemeral: true });
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: s.wallet - amount });
  db.updateUser(interaction.guildId, target.id, { wallet: (r.wallet || 0) + amount });
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('💸 Transfer Successful').setDescription('You sent **' + '\u0024' + formatNumber(amount) + '** coins to ' + target.toString() + '!')] });
}
