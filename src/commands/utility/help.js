import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View the all-in-one command guide and interactive feature manual');

export async function execute(interaction, client) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: config.botName, iconURL: config.assets.logoGif })
    .setTitle('🤖 ' + config.botName + ' — All-In-One Command Menu')
    .setDescription('Welcome to the official bot of **SAURAXT KA server**!\n\nSelect a category from the dropdown menu below to view full details and slash commands for each module.')
    .setImage(config.assets.banner)
    .addFields(
      { name: '🎵 Music & Voice System', value: 'High quality audio playback, queue management, volume, loop & controller buttons', inline: false },
      { name: '🔴 YouTube Live Alerts', value: '24/7 automated stream & video announcements with role pings & thumbnail embeds', inline: false },
      { name: '🤖 Auto AI Chatbot', value: 'Dedicated #ai-chat channel and direct @mention natural multilingual AI responses', inline: false },
      { name: '🛡️ Moderation & Security', value: 'Ban, Kick, Timeout, Warn, Purge, Nuke, Slowmode & 24/7 AutoMod protection', inline: false },
      { name: '🪙 Economy & Casino', value: 'Daily, Work, Beg, Rob, Pay, Deposit, Blackjack, Slots, Coinflip, Shop & Rich list', inline: false },
      { name: '⭐ Leveling & XP', value: 'Rank cards, XP gain on chatting, Leaderboard, Level channel & Role rewards', inline: false },
      { name: '📩 Support Tickets', value: 'Interactive button support panels, private channels, claim & transcripts', inline: false },
      { name: '🎉 Giveaways', value: 'Interactive button entry giveaways, countdown timers, auto-winner selection & rerolls', inline: false },
      { name: '⚙️ Server Configuration', value: 'One-click Server Setup, Welcome greetings, Goodbye, Button Roles & Audit Logs', inline: false }
    )
    .setFooter({ text: 'Use the dropdown below to explore specific categories', iconURL: config.assets.logoGif })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category to view commands...')
    .addOptions([
      { label: 'Music & Audio System', value: 'music', emoji: '🎵', description: 'Play, pause, queue, skip, volume, loop' },
      { label: 'Moderation & Security', value: 'moderation', emoji: '🛡️', description: 'Server protection, bans, mutes, automod' },
      { label: 'Economy & Casino', value: 'economy', emoji: '🪙', description: 'Coins, banking, blackjack, slots, shop' },
      { label: 'Leveling & XP', value: 'leveling', emoji: '⭐', description: 'Rank card, XP leaderboard, level channels' },
      { label: 'Support Tickets', value: 'tickets', emoji: '📩', description: 'Interactive ticket panels & support' },
      { label: 'Giveaways', value: 'giveaway', emoji: '🎉', description: 'Host and manage server giveaways' },
      { label: 'Server Configuration', value: 'config', emoji: '⚙️', description: 'Setup server, YouTube, AI chat, welcome, logs' },
      { label: 'Utility & Tools', value: 'utility', emoji: '🛠️', description: 'Serverinfo, userinfo, embeds, polls, afk' },
      { label: 'Fun & Games', value: 'fun', emoji: '🎮', description: 'Games, trivia, memes, AI bot' }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return interaction.reply({ embeds: [embed], components: [row] });
}