import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { db } from '../../database/db.js';
import { formatNumber } from '../../utils/formatters.js';
import { config } from '../../config.js';
const deck = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function getCardValue(c) { if (['J', 'Q', 'K'].includes(c)) return 10; if (c === 'A') return 11; return parseInt(c, 10); }
function calculateHand(h) { let t = 0, a = 0; for (const c of h) { t += getCardValue(c); if (c === 'A') a++; } while (t > 21 && a > 0) { t -= 10; a--; } return t; }
function drawCard() { return deck[Math.floor(Math.random() * deck.length)]; }
export const data = new SlashCommandBuilder().setName('blackjack').setDescription('Play Blackjack').addIntegerOption(opt => opt.setName('bet').setDescription('Bet').setMinValue(20).setRequired(true));
export async function execute(interaction) {
  const bet = interaction.options.getInteger('bet');
  const p = db.getUser(interaction.guildId, interaction.user.id);
  if ((p.wallet || 0) < bet) return interaction.reply({ content: '❌ Not enough coins!', ephemeral: true });
  db.updateUser(interaction.guildId, interaction.user.id, { wallet: p.wallet - bet });
  const pH = [drawCard(), drawCard()], dH = [drawCard(), drawCard()];
  let pS = calculateHand(pH), dS = calculateHand(dH);
  if (pS === 21) {
    const payout = Math.floor(bet * 2.5);
    db.updateUser(interaction.guildId, interaction.user.id, { wallet: p.wallet + payout });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.gold).setTitle('🃏 BLACKJACK! Natural 21!').setDescription('🎉 You won **' + '\u0024' + formatNumber(payout) + '** coins!')] });
  }
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary));
  const getEmbed = (inProgress = true, status = '') => new EmbedBuilder().setColor(config.colors.primary).setTitle('🃏 Blackjack Table').addFields({ name: 'Your Hand (' + calculateHand(pH) + ')', value: pH.join(' '), inline: true }, { name: inProgress ? 'Dealer Hand' : 'Dealer Hand (' + calculateHand(dH) + ')', value: inProgress ? dH[0] + ' 🂠' : dH.join(' '), inline: true }, { name: 'Bet', value: '\u0024' + formatNumber(bet), inline: true }).setDescription(status || 'Click Hit or Stand.').setTimestamp();
  const response = await interaction.reply({ embeds: [getEmbed(true)], components: [row] });
  const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, filter: i => i.user.id === interaction.user.id });
  collector.on('collect', async i => {
    if (i.customId === 'bj_hit') {
      pH.push(drawCard());
      pS = calculateHand(pH);
      if (pS > 21) {
        collector.stop('busted');
        return i.update({ embeds: [getEmbed(false, '💥 **BUSTED!** You went over 21 (' + pS + ') and lost **' + '\u0024' + formatNumber(bet) + '**.')], components: [] });
      }
      await i.update({ embeds: [getEmbed(true)], components: [row] });
    }
    if (i.customId === 'bj_stand') {
      collector.stop('stand');
      while (calculateHand(dH) < 17) dH.push(drawCard());
      dS = calculateHand(dH);
      let winStatus = '', winPayout = 0;
      if (dS > 21 || pS > dS) {
        winPayout = bet * 2; winStatus = '🎉 **YOU WON!** You received **+' + '\u0024' + formatNumber(winPayout) + '** coins!';
        const u = db.getUser(interaction.guildId, interaction.user.id);
        db.updateUser(interaction.guildId, interaction.user.id, { wallet: u.wallet + winPayout });
      } else if (pS === dS) {
        winPayout = bet; winStatus = '⚖️ **PUSH!** Bet refunded.';
        const u = db.getUser(interaction.guildId, interaction.user.id);
        db.updateUser(interaction.guildId, interaction.user.id, { wallet: u.wallet + winPayout });
      } else {
        winStatus = '💀 **DEALER WINS!** You lost **' + '\u0024' + formatNumber(bet) + '** coins.';
      }
      await i.update({ embeds: [getEmbed(false, winStatus)], components: [] });
    }
  });
}
