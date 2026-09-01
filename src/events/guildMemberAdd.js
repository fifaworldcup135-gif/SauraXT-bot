import { EmbedBuilder } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export const once = false;

export async function execute(member, client) {
  const guildSettings = db.getGuild(member.guild.id);

  // 1. Auto-Role
  if (guildSettings.autoRoleId) {
    const role = member.guild.roles.cache.get(guildSettings.autoRoleId);
    if (role) {
      await member.roles.add(role).catch(err => console.error('Failed to assign autorole:', err));
    }
  }

  // 2. Welcome Message
  if (guildSettings.welcomeChannel) {
    const channel = member.guild.channels.cache.get(guildSettings.welcomeChannel);
    if (channel) {
      const rawMsg = guildSettings.welcomeMessage || 'Welcome {user} to **{server}**! ??';
      const formatted = rawMsg
        .replace(/{user}/g, member.toString())
        .replace(/{tag}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount.toString());

      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`?? Welcome to ${member.guild.name}!`)
        .setDescription(formatted)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '?? Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '?? Member Count', value: `#${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();

      channel.send({ content: `Welcome ${member}!`, embeds: [welcomeEmbed] }).catch(() => {});
    }
  }

  // 3. Mod Log
  if (guildSettings.modLogChannel) {
    const logChan = member.guild.channels.cache.get(guildSettings.modLogChannel);
    if (logChan) {
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('?? Member Joined')
        .setDescription(`**${member.user.tag}** (${member.id}) joined the server.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields({ name: 'Total Members', value: `${member.guild.memberCount}`, inline: true })
        .setTimestamp();
      logChan.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }
}
