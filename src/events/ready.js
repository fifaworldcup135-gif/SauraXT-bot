import { ActivityType } from 'discord.js';
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
}