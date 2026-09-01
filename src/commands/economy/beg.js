import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatDuration } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('beg').setDescription('Beg for spare change (every 5 minutes)');
export async function execute(interaction) {
  const p = db.getUser(interaction.guildId, interaction.user.id);
  const now = Date.now(), cd = 5 * 60 * 1000;
  if (now - (p.lastBeg || 0) < cd) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle('⏳ Begging Cooldown').setDescription('Wait **' + formatDuration(cd - (now - p.lastBeg)) + '**.')], ephemeral: true });
  if (Math.random() <= 0.3) {
    db.updateUser(interaction.guildId, interaction.user.id, { lastBeg: now });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle('😢 No Luck').setDescription('Nobody gave you any money.')] });
  }
  const amount = Math.floor(Math.random() * 120) + 30;
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: (p.wallet || 0) + amount, lastBeg: now });
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🪙 Kind Stranger!').setDescription('A stranger handed you **' + '\u0024' + amount + '** coins!')] });
}
