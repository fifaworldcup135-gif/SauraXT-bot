import { EmbedBuilder } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export const once = false;

export async function execute(oldMessage, newMessage, client) {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const guildSettings = db.getGuild(oldMessage.guild.id);
  if (!guildSettings.modLogChannel) return;

  const logChannel = oldMessage.guild.channels.cache.get(guildSettings.modLogChannel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('?? Message Edited')
    .addFields(
      { name: 'Author', value: `${oldMessage.author?.tag || 'Unknown'} (${oldMessage.author?.id || 'N/A'})`, inline: true },
      { name: 'Channel', value: `${oldMessage.channel}`, inline: true },
      { name: 'Before', value: oldMessage.content ? oldMessage.content.slice(0, 500) : '*Empty*', inline: false },
      { name: 'After', value: newMessage.content ? newMessage.content.slice(0, 500) : '*Empty*', inline: false }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] }).catch(() => {});
}
