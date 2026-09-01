import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';
import { formatNumber } from '../../utils/formatters.js';
export const data = new SlashCommandBuilder().setName('buy').setDescription('Purchase item').addStringOption(opt => opt.setName('item_id').setDescription('Item ID').setRequired(true).addChoices(...config.shopItems.map(item => ({ name: item.name + ' (' + '\u0024' + formatNumber(item.price) + ')', value: item.id }))));
export async function execute(interaction) {
  const itemId = interaction.options.getString('item_id'), item = config.shopItems.find(i => i.id === itemId);
  if (!item) return interaction.reply({ content: '❌ Invalid item ID.', ephemeral: true });
  const p = db.getUser(interaction.guildId, interaction.user.id);
  if ((p.wallet || 0) < item.price) return interaction.reply({ content: '❌ Not enough coins! (Needed: ' + '\u0024' + formatNumber(item.price) + ')', ephemeral: true });
  const inv = p.inventory || {};
  inv[item.id] = (inv[item.id] || 0) + 1;
  const up = { wallet: p.wallet - item.price, inventory: inv };
  if (item.id === 'shield') up.shieldUntil = Date.now() + (24 * 60 * 60 * 1000);
  db.updateUser(interaction.guildId, interaction.user.id, up);
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🛍️ Purchase Successful!').setDescription('Purchased **' + item.name + '** for **' + '\u0024' + formatNumber(item.price) + '** coins!')] });
}
