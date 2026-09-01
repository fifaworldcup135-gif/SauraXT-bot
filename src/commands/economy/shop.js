import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { formatNumber } from '../../utils/formatters.js';
export const data = new SlashCommandBuilder().setName('shop').setDescription('View item shop');
export async function execute(interaction) {
  const embed = new EmbedBuilder().setColor(config.colors.gold).setTitle('🏪 Server Item Shop').setDescription('Use `/buy <item_id>` to purchase:').addFields(config.shopItems.map(item => ({ name: item.name + ' — ' + '\u0024' + formatNumber(item.price), value: '**ID:** `' + item.id + '`\n' + item.description, inline: false }))).setFooter({ text: 'SAURAXT Economy Shop' }).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
