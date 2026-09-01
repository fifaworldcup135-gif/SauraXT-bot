import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber, formatDuration } from '../../utils/formatters.js';
import { config } from '../../config.js';
export const data = new SlashCommandBuilder().setName('rob').setDescription('Rob coins from a member').addUserOption(opt => opt.setName('target').setDescription('Member').setRequired(true));
export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot rob yourself.', ephemeral: true });
  if (target.bot) return interaction.reply({ content: '❌ Cannot rob bots.', ephemeral: true });
  const r = db.getUser(interaction.guildId, interaction.user.id), v = db.getUser(interaction.guildId, target.id);
  const now = Date.now(), cd = 2 * 60 * 60 * 1000;
  if (now - (r.lastRob || 0) < cd) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle('⏳ Rob Cooldown').setDescription('Wait **' + formatDuration(cd - (now - r.lastRob)) + '**.')], ephemeral: true });
  if ((r.wallet || 0) < 200) return interaction.reply({ content: '❌ You need at least ' + '\u0024' + '200 in wallet!', ephemeral: true });
  if ((v.wallet || 0) < 100) return interaction.reply({ content: '❌ Target has less than ' + '\u0024' + '100.', ephemeral: true });
  if (v.shieldUntil && v.shieldUntil > now) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.primary).setTitle('🛡️ Rob Blocked!').setDescription(target.username + ' is protected by a shield!')] });
  if (Math.random() > 0.55) {
    const stolen = Math.floor(v.wallet * ((Math.random() * 0.4) + 0.2));
    db.updateUser(interaction.guildId, interaction.user.id, { wallet: r.wallet + stolen, lastRob: now });
    db.updateUser(interaction.guildId, target.id, { wallet: v.wallet - stolen });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🦹 Robbery Successful!').setDescription('You stole **' + '\u0024' + formatNumber(stolen) + '** from ' + target.toString() + '!')] });
  } else {
    const fine = Math.floor(r.wallet * 0.3);
    db.updateUser(interaction.guildId, interaction.user.id, { wallet: r.wallet - fine, lastRob: now });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle('🚨 Caught!').setDescription('You paid a fine of **' + '\u0024' + formatNumber(fine) + '** coins.')] });
  }
}
