import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber, formatDuration } from '../../utils/formatters.js';
import { config } from '../../config.js';
const jobs = ['Software Engineer', 'Discord Mod', 'YouTuber', 'Crypto Trader', 'Burger Flipper', 'Streamer', 'Game Developer', 'Mechanic', 'Doctor', 'Astronaut'];
export const data = new SlashCommandBuilder().setName('work').setDescription('Work a job shift (every 1 hour)');
export async function execute(interaction) {
  const p = db.getUser(interaction.guildId, interaction.user.id);
  const now = Date.now(), cd = 60 * 60 * 1000;
  if (now - (p.lastWork || 0) < cd) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle('⏳ Work Shift Cooldown').setDescription('Wait **' + formatDuration(cd - (now - p.lastWork)) + '**.')], ephemeral: true });
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  let earned = Math.floor(Math.random() * 400) + 300;
  if (p.inventory?.fishing_rod) earned = Math.floor(earned * 1.25);
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: (p.wallet || 0) + earned, lastWork: now });
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('💼 Work Shift Complete').setDescription('You worked as a **' + job + '** and earned **' + '\u0024' + formatNumber(earned) + '** coins!')] });
}
