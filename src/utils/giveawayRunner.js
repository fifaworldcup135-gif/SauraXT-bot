import { EmbedBuilder } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export function startGiveawayChecker(client) {
  setInterval(async () => {
    try {
      const activeGiveaways = db.getAllActiveGiveaways();
      const now = Date.now();

      for (const gw of activeGiveaways) {
        if (gw.endAt <= now) {
          await endGiveaway(client, gw);
        }
      }
    } catch (err) {
      console.error('Error in giveaway checker loop:', err);
    }
  }, 5000);
}

export async function endGiveaway(client, gw) {
  try {
    const channel = await client.channels.fetch(gw.channelId).catch(() => null);
    if (!channel) {
      db.updateGiveaway(gw.messageId, { ended: true });
      return;
    }

    const message = await channel.messages.fetch(gw.messageId).catch(() => null);
    if (!message) {
      db.updateGiveaway(gw.messageId, { ended: true });
      return;
    }

    // If message is already marked as ended on Discord, sync DB and skip
    if (message.embeds.length > 0 && message.embeds[0].title?.includes('ENDED')) {
      db.updateGiveaway(gw.messageId, { ended: true });
      return;
    }

    // Immediately mark as ended to prevent concurrent interval runs
    db.updateGiveaway(gw.messageId, { ended: true });

    const entries = gw.entries || [];
    const winnersCount = gw.winnersCount || 1;
    const winners = [];

    if (entries.length === 0) {
      const endedEmbed = EmbedBuilder.from(message.embeds[0] || new EmbedBuilder())
        .setColor(config.colors.error)
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setDescription(`**Prize:** ${gw.prize}\n**Winner(s):** No valid entries!\n**Hosted by:** <@${gw.hostedBy}>`)
        .setFooter({ text: 'Giveaway Concluded' });

      await message.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});
      await channel.send(`⚠️ Giveaway for **${gw.prize}** ended, but nobody entered!`).catch(() => {});
    } else {
      const shuffled = [...entries].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(winnersCount, entries.length));
      const winnersMention = selected.map(id => `<@${id}>`).join(', ');

      const endedEmbed = EmbedBuilder.from(message.embeds[0] || new EmbedBuilder())
        .setColor(config.colors.gold)
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setDescription(`**Prize:** ${gw.prize}\n**Winner(s):** ${winnersMention}\n**Hosted by:** <@${gw.hostedBy}>`)
        .setFooter({ text: 'Giveaway Concluded' });

      await message.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});
      await channel.send(`🎉 Congratulations ${winnersMention}! You won the **${gw.prize}**! 🎁`).catch(() => {});
    }

    db.updateGiveaway(gw.messageId, { ended: true, winners });
  } catch (err) {
    console.error(`Failed to end giveaway ${gw.messageId}:`, err);
    db.updateGiveaway(gw.messageId, { ended: true });
  }
}
