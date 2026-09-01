import { EmbedBuilder } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export const once = false;

export async function execute(oldState, newState, client) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  const guildSettings = db.getGuild(guild.id);
  if (!guildSettings.modLogChannel) return;

  const logChannel = guild.channels.cache.get(guildSettings.modLogChannel);
  if (!logChannel) return;

  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  // Joined Voice
  if (!oldState.channelId && newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('?? Voice Channel Joined')
      .setDescription(`**${member.user.tag}** joined ${newState.channel.name}`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
  // Left Voice
  else if (oldState.channelId && !newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('?? Voice Channel Left')
      .setDescription(`**${member.user.tag}** left ${oldState.channel.name}`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
  // Switched Voice Channel
  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('?? Voice Channel Switched')
      .setDescription(`**${member.user.tag}** moved from ${oldState.channel.name} to ${newState.channel.name}`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
}
