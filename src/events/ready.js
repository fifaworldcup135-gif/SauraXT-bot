import { ActivityType, PermissionFlagsBits } from 'discord.js';
import { startGiveawayChecker } from '../utils/giveawayRunner.js';
import { startYouTubeNotifier } from '../utils/youtubeNotifier.js';
import { config } from '../config.js';

export const once = true;

export async function execute(client) {
  console.log('✅ Logged in as ' + client.user.tag + ' (ID: ' + client.user.id + ')');
  console.log('🌐 Serving ' + client.guilds.cache.size + ' server(s) and ' + client.users.cache.size + ' cached user(s).');

  // Set rotating presence
  const activities = [
    { name: '🔴 SAURAXT YouTube Stream', type: ActivityType.Watching },
    { name: 'over SAURAXT KA server', type: ActivityType.Watching },
    { name: '/help for all commands', type: ActivityType.Listening },
    { name: '24/7 Cloud Engine Active', type: ActivityType.Playing },
    { name: 'Economy, AI Chat & Tickets', type: ActivityType.Competing }
  ];

  let activityIndex = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [activities[activityIndex]],
      status: 'online'
    });
    activityIndex = (activityIndex + 1) % activities.length;
  }, 15000);

  // Start giveaway runner loop
  startGiveawayChecker(client);
  console.log('🎉 Giveaway auto-runner initialized.');

  // Start 24/7 YouTube live stream notifier
  startYouTubeNotifier(client);

  // Automatically scan and clean existing scam / unauthorized @everyone spam on boot
  setTimeout(() => cleanupStartupSpam(client), 3000);
}

async function cleanupStartupSpam(client) {
  try {
    console.log('🛡️ [AutoMod Boot Scan] Scanning channels for recent scam / spam messages...');
    for (const guild of client.guilds.cache.values()) {
      const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor(client.user)?.has(PermissionFlagsBits.ManageMessages));
      for (const channel of textChannels.values()) {
        try {
          const messages = await channel.messages.fetch({ limit: 100 });
          for (const msg of messages.values()) {
            if (msg.author.bot) continue;
            const isMod = msg.member?.permissions.has(PermissionFlagsBits.ManageMessages) || 
                          msg.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                          msg.member?.permissions.has(PermissionFlagsBits.MentionEveryone);
            if (isMod) continue;

            const contentLower = msg.content.toLowerCase();
            const hasEveryone = contentLower.includes('@everyone') || contentLower.includes('@here') || msg.mentions.everyone;
            const isScam = hasEveryone || 
                           contentLower.includes('mrbeast') || 
                           contentLower.includes('promo code') || 
                           contentLower.includes('bonus code') ||
                           contentLower.includes('free nitro') ||
                           contentLower.includes('claim nitro') ||
                           contentLower.includes('airdrop') ||
                           (contentLower.includes('crypto') && (contentLower.includes('bonus') || contentLower.includes('code') || msg.attachments?.size > 0));

            if (isScam) {
              console.log(`🛡️ [AutoMod Boot Cleanup] Deleting spam message (${msg.id}) by ${msg.author.tag} in #${channel.name}`);
              await msg.delete().catch(() => {});
              await new Promise(r => setTimeout(r, 400));
            }
          }
        } catch (chanErr) {}
      }
    }
    console.log('🛡️ [AutoMod Boot Scan] Scan completed.');
  } catch (err) {
    console.error('Error in startup scam cleanup:', err);
  }
}