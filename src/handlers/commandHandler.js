import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(client) {
  client.commands = new Map();
  const commandsArray = [];
  const commandsPath = path.join(__dirname, '../commands');

  const knownCategories = ['moderation', 'economy', 'leveling', 'tickets', 'giveaway', 'config', 'utility', 'fun', 'music'];

  for (const category of knownCategories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.existsSync(categoryPath)) continue;

    let commandFiles = [];
    try {
      commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    } catch (err) {
      console.error('Error reading category ' + category + ':', err.message);
      continue;
    }

    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      const fileUrl = pathToFileURL(filePath).href;
      try {
        const command = await import(fileUrl);
        if (command.data && command.execute) {
          const cmdObj = {
            data: command.data,
            execute: command.execute,
            category
          };
          client.commands.set(command.data.name, cmdObj);
          commandsArray.push(command.data.toJSON());
        } else {
          console.warn('[WARNING] Command at ' + filePath + ' is missing data or execute.');
        }
      } catch (err) {
        console.error('Failed to load command at ' + filePath + ':', err);
      }
    }
  }

  console.log('✅ Loaded ' + client.commands.size + ' Slash Commands.');

  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID || '1062342294398836737';

  if (token && clientId) {
    const rest = new REST({ version: '10' }).setToken(token);
    try {
      console.log('🔄 Registering global slash commands with Discord...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandsArray }
      );
      console.log('✅ Successfully registered ' + commandsArray.length + ' global slash commands!');
    } catch (err) {
      console.error('❌ Failed to register global slash commands:', err);
    }
  }
}