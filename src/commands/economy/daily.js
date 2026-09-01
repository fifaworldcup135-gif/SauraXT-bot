import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber, formatDuration } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('daily').setDescription('Claim daily coins reward');
export async function execute(interaction) {
  const p = db.getUser(interaction.guildId, interaction.user.id);
  const now = Date.now(), cd = 24 * 60 * 60 * 1000;
  if (now - (p.lastDaily || 0) < cd) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle('⏳ Daily Reward Cooldown').setDescription('Come back in **' + formatDuration(cd - (now - p.lastDaily)) + '**.')], ephemeral: true });
  const r = Math.floor(Math.random() * 500) + 1000;
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: (p.wallet || 0) + r, lastDaily: now });
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🎁 Daily Reward Claimed!').setDescription('You collected **' + '\u0024' + formatNumber(r) + '** coins!\nNew balance: **' + '\u0024' + formatNumber((p.wallet || 0) + r) + '**.')] });
}
