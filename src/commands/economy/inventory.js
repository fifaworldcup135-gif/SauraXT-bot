import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('inventory').setDescription('View inventory').addUserOption(opt => opt.setName('target').setDescription('Member').setRequired(false));
export async function execute(interaction) {
  const target = interaction.options.getUser('target') || interaction.user, p = db.getUser(interaction.guildId, target.id), inv = p.inventory || {};
  const list = Object.entries(inv).filter(([_, c]) => c > 0).map(([id, c]) => { const def = config.shopItems.find(i => i.id === id); return '• **' + (def ? def.name : id) + '** x' + c; });
  const isS = p.shieldUntil && p.shieldUntil > Date.now();
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.primary).setTitle('🎒 ' + target.username + "'s Inventory").setThumbnail(target.displayAvatarURL({ dynamic: true })).setDescription(list.length > 0 ? list.join('\n') : '*Inventory is empty.*').addFields({ name: '🛡️ Rob Shield', value: isS ? '<t:' + Math.floor(p.shieldUntil / 1000) + ':R>' : 'Inactive', inline: true })] });
}
