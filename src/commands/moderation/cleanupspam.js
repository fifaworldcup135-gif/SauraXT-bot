import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('cleanupspam')
  .setDescription('Scan the entire server and delete all unauthorized @everyone & crypto scam messages')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  let totalDeleted = 0;
  const scamChannels = [];

  const textChannels = guild.channels.cache.filter(c => c.isTextBased());

  for (const channel of textChannels.values()) {
    const cName = channel.name.toLowerCase();
    // Do NOT sweep whitelisted game drop / announcement channels like #free-games!
    if (cName.includes('free-game') || cName.includes('freegame') || cName.includes('giveaway') || cName.includes('drop')) continue;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      let channelDeleted = 0;

      for (const msg of messages.values()) {
        if (msg.author.bot || msg.author.username.toLowerCase().includes('freestuff')) continue;

        const isMod = msg.member?.permissions.has(PermissionFlagsBits.ManageMessages) || 
                      msg.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                      msg.member?.permissions.has(PermissionFlagsBits.MentionEveryone);

        if (isMod) continue;

        const contentLower = msg.content.toLowerCase();
        const hasEveryone = contentLower.includes('@everyone') || contentLower.includes('@here') || msg.mentions.everyone;
        const isScam = hasEveryone || 
                       contentLower.includes('mrbeast') || 
                       contentLower.includes('promo code') || 
                       contentLower.includes('bonus code') ||
                       contentLower.includes('free nitro') ||
                       contentLower.includes('claim nitro') ||
                       contentLower.includes('airdrop') ||
                       (contentLower.includes('crypto') && (contentLower.includes('bonus') || contentLower.includes('code') || msg.attachments?.size > 0));

        if (isScam) {
          await msg.delete().catch(() => {});
          channelDeleted++;
          totalDeleted++;
          await new Promise(r => setTimeout(r, 400));
        }
      }

      if (channelDeleted > 0) {
        scamChannels.push(`• **#${channel.name}**: ${channelDeleted} spam message(s) deleted`);
      }
    } catch (err) {}
  }

  const resultEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('🛡️ Server Spam Sweep Complete')
    .setDescription(totalDeleted > 0 
      ? `Successfully deleted **${totalDeleted}** spam message(s) across the server!\n\n${scamChannels.join('\n')}\n\n*Zero members were kicked or banned.*`
      : '✅ No unauthorized `@everyone` or crypto scam messages were found in recent history!')
    .setFooter({ text: 'SauraXT 24/7 Server Shield • Zero Member Kicks' })
    .setTimestamp();

  return interaction.editReply({ embeds: [resultEmbed] });
}
