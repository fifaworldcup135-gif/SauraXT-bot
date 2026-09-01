import { EmbedBuilder } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export const once = false;

export async function execute(member, client) {
  const guildSettings = db.getGuild(member.guild.id);

  // 1. Goodbye Message
  if (guildSettings.goodbyeChannel) {
    const channel = member.guild.channels.cache.get(guildSettings.goodbyeChannel);
    if (channel) {
      const rawMsg = guildSettings.goodbyeMessage || '{user} has left the server. Goodbye! ??';
      const formatted = rawMsg
        .replace(/{user}/g, member.user.username)
        .replace(/{tag}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount.toString());

      const leaveEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('?? Member Left')
        .setDescription(formatted)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Remaining members: ${member.guild.memberCount}` })
        .setTimestamp();

      channel.send({ embeds: [leaveEmbed] }).catch(() => {});
    }
  }

  // 2. Mod Log
  if (guildSettings.modLogChannel) {
    const logChan = member.guild.channels.cache.get(guildSettings.modLogChannel);
    if (logChan) {
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('?? Member Left')
        .setDescription(`**${member.user.tag}** (${member.id}) left or was kicked.`)
        .setTimestamp();
      logChan.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }
}
