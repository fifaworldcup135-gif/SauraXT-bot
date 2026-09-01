import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

export function baseEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setFooter({ text: `${config.botName} ? SAURAXT KA server`, iconURL: 'https://cdn.discordapp.com/emojis/1062342294398836737.png' })
    .setTimestamp();
}

export function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`${config.emojis.success} ${title}`)
    .setDescription(description || '')
    .setFooter({ text: `${config.botName} ? Success` })
    .setTimestamp();
}

export function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle(`${config.emojis.error} ${title}`)
    .setDescription(description || 'An unexpected error occurred.')
    .setFooter({ text: `${config.botName} ? Error` })
    .setTimestamp();
}

export function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(title)
    .setDescription(description || '')
    .setFooter({ text: `${config.botName} ? SAURAXT KA server` })
    .setTimestamp();
}

export function modEmbed(action, target, moderator, reason, extraFields = []) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`${config.emojis.mod} Moderation Action: ${action}`)
    .addFields(
      { name: 'Target User', value: `${target.tag || target.user?.tag || target.username || target} (${target.id || target})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag || moderator.user?.tag || moderator.username || moderator}`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false }
    )
    .setFooter({ text: `Mod Action ID: ${Date.now().toString(36).toUpperCase()}` })
    .setTimestamp();

  if (extraFields && extraFields.length > 0) {
    embed.addFields(extraFields);
  }
  return embed;
}
