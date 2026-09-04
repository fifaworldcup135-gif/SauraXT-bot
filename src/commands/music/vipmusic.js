import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { musicManager } from '../../utils/musicManager.js';

export const data = new SlashCommandBuilder()
  .setName('vipmusic')
  .setDescription('Manage professional VIP Music Lounge permissions & settings')
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Configure VIP Lounge role and dedicated channels (Admin only)')
      .addRoleOption(opt => opt.setName('role').setDescription('The VIP / Booster role to grant access').setRequired(false))
      .addChannelOption(opt => opt.setName('voice_lounge').setDescription('The dedicated VIP voice lounge').addChannelTypes(ChannelType.GuildVoice).setRequired(false))
      .addChannelOption(opt => opt.setName('text_channel').setDescription('The dedicated VIP text command channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Check VIP Music Lounge configuration & active privileges')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const guildSettings = db.getGuild(guildId);

  if (subcommand === 'setup') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [errorEmbed('Admin Required', 'You need Administrator permissions to configure VIP Music Lounge!')],
        ephemeral: true
      });
    }

    const role = interaction.options.getRole('role');
    const voiceLounge = interaction.options.getChannel('voice_lounge');
    const textChannel = interaction.options.getChannel('text_channel');

    const currentVip = guildSettings.vipMusic || {};
    const newVip = {
      roleId: role ? role.id : currentVip.roleId,
      voiceChannelId: voiceLounge ? voiceLounge.id : currentVip.voiceChannelId,
      textChannelId: textChannel ? textChannel.id : currentVip.textChannelId
    };

    db.updateGuild(guildId, { vipMusic: newVip });

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('👑 VIP Music Lounge Configured Successfully!')
      .setDescription('Professional VIP music permissions have been updated for **' + interaction.guild.name + '**.')
      .addFields(
        { name: '💎 VIP Role', value: newVip.roleId ? `<@&${newVip.roleId}>` : 'Auto-detected (`VIP`, `Booster`, `OG`)', inline: true },
        { name: '🎙️ VIP Voice Lounge', value: newVip.voiceChannelId ? `<#${newVip.voiceChannelId}>` : 'Auto-detected (`VIP Hangout`)', inline: true },
        { name: '💬 VIP Text Channel', value: newVip.textChannelId ? `<#${newVip.textChannelId}>` : 'Auto-detected (`#vip-lounge`)', inline: true },
        { name: '🎚️ VIP Fidelity', value: '💎 Ultra HD 384kbps Lossless Audio', inline: false },
        { name: '🛡️ VIP Protection', value: 'Active (Non-VIPs will be politely redirected to public lounges)', inline: false }
      )
      .setFooter({ text: 'SauraXT VIP Lounge Suite' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'status') {
    const isVip = musicManager.isVipMember(interaction.member, guildSettings);
    const vipData = guildSettings.vipMusic || {};

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('👑 VIP Music Lounge • Status & Privileges')
      .setDescription('Overview of professional VIP lounge audio settings in **' + interaction.guild.name + '**.')
      .addFields(
        { name: '👤 Your VIP Status', value: isVip ? '✅ **VIP Verified Member** (Full VIP Lounge Access)' : 'ℹ️ Standard Member (Public Lounges Available)', inline: false },
        { name: '💎 Designated VIP Role', value: vipData.roleId ? `<@&${vipData.roleId}>` : 'Auto-detecting all VIP, Booster, and OG roles', inline: true },
        { name: '🎙️ Dedicated VIP Lounge', value: vipData.voiceChannelId ? `<#${vipData.voiceChannelId}>` : 'Auto-detecting `VIP Hangout` / VIP Lounges', inline: true },
        { name: '✨ VIP Exclusive Perks', value: '• **Golden Luxury Player Theme**\n• **384kbps Lossless Audio Fidelity**\n• **Volume Boost up to 150%**\n• **Priority Audio Stream Queue**\n• **Lounge Protection from Non-VIP Interruption**', inline: false }
      )
      .setFooter({ text: 'SauraXT VIP Lounge Suite' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}