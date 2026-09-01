import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('Display detailed statistics and information about this server');

export async function execute(interaction) {
  const guild = interaction.guild;
  const owner = await guild.fetchOwner();

  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📊 Server Information: ' + guild.name)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
    .addFields(
      { name: '👑 Server Owner', value: owner.user.tag + ' (<@' + owner.id + '>)', inline: true },
      { name: '🆔 Server ID', value: '`' + guild.id + '`', inline: true },
      { name: '📅 Created On', value: '<t:' + Math.floor(guild.createdTimestamp / 1000) + ':D> (<t:' + Math.floor(guild.createdTimestamp / 1000) + ':R>)', inline: false },
      { name: '👥 Total Members', value: '`' + guild.memberCount + '` members', inline: true },
      { name: '💎 Boost Level', value: 'Level ' + guild.premiumTier + ' (' + (guild.premiumSubscriptionCount || 0) + ' boosts)', inline: true },
      { name: '🛡️ Verification', value: String(guild.verificationLevel), inline: true },
      { name: '💬 Channels', value: '📁 ' + categories + ' Categories | 💬 ' + textChannels + ' Text | 🔊 ' + voiceChannels + ' Voice', inline: false },
      { name: '🎭 Roles', value: '`' + guild.roles.cache.size + '` roles', inline: true },
      { name: '😀 Emojis & Stickers', value: '`' + guild.emojis.cache.size + '` emojis | `' + guild.stickers.cache.size + '` stickers', inline: true }
    )
    .setFooter({ text: 'SAURAXT Server Metrics' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
