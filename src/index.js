import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

if (ffmpegPath) {
  try {
    fs.chmodSync(ffmpegPath, 0o755);
  } catch (e) {}
  process.env.FFMPEG_PATH = ffmpegPath;
  try {
    const ffmpegDir = path.dirname(ffmpegPath);
    if (process.env.PATH && !process.env.PATH.includes(ffmpegDir)) {
      process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
    }
  } catch (e) {}
}

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadCommands } from './handlers/commandHandler.js';
import { startKeepAliveServer } from './server.js';
import { config } from './config.js';

console.log('====================================================');
console.log('🚀 Starting ' + config.botName + ' (v' + config.version + ')');
console.log('====================================================');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// Global Error Protection - Prevent Bot Crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [ANTI-CRASH] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('⚠️ [ANTI-CRASH] Uncaught Exception:', err, 'Origin:', origin);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error('⚠️ [ANTI-CRASH] Exception Monitor:', err);
});

async function main() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error('❌ ERROR: BOT_TOKEN is missing. Please set BOT_TOKEN in the Env tab or .env file!');
    process.exit(1);
  }

  // 1. Start 24/7 Web Keep-Alive Dashboard
  startKeepAliveServer(client);

  // 2. Load Gateway Events
  await loadEvents(client);

  // 3. Load & Register Slash Commands
  await loadCommands(client);

  // 4. Log in to Discord Gateway
  console.log('📡 Connecting to Discord Gateway...');
  try {
    await client.login(token);
  } catch (err) {
    console.error('❌ Failed to login to Discord:', err);
  }
}

main();

export { client };