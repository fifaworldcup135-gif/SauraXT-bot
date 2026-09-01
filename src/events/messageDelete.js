import { EmbedBuilder } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export const once = false;

export async function execute(message, client) {
  if (!message.guild || message.author?.bot) return;

  const guildSettings = db.getGuild(message.guild.id);
  if (!guildSettings.modLogChannel) return;

  const logChannel = message.guild.channels.cache.get(guildSettings.modLogChannel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('??? Message Deleted')
    .addFields(
      { name: 'Author', value: `${message.author?.tag || 'Unknown'} (${message.author?.id || 'N/A'})`, inline: true },
      { name: 'Channel', value: `${message.channel}`, inline: true },
      { name: 'Content', value: message.content ? message.content.slice(0, 1000) : '*No text content (Image/Attachment/Embed)*', inline: false }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] }).catch(() => {});
}
