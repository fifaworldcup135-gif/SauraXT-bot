import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('balance').setDescription('Check wallet and bank balance').addUserOption(opt => opt.setName('target').setDescription('Member').setRequired(false));
export async function execute(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const p = db.getUser(interaction.guildId, target.id);
  const w = p.wallet || 0, b = p.bank || 0;
  const embed = new EmbedBuilder().setColor(config.colors.gold).setTitle('💰 ' + target.username + "'s Bank Account").setThumbnail(target.displayAvatarURL({ dynamic: true })).addFields({ name: '💵 Wallet', value: '**' + '\u0024' + formatNumber(w) + '**', inline: true }, { name: '🏦 Bank', value: '**' + '\u0024' + formatNumber(b) + '** / ' + '\u0024' + formatNumber(p.bankCapacity || 5000), inline: true }, { name: '💎 Net Worth', value: '**' + '\u0024' + formatNumber(w + b) + '**', inline: true }).setFooter({ text: 'SAURAXT Economy System' }).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}
