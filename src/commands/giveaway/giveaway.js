import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { db } from '../../database/db.js';
import { config } from '../../config.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { endGiveaway } from '../../utils/giveawayRunner.js';
import ms from 'ms';

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage server giveaways')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start a new interactive giveaway')
      .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 30m, 2h, 1d, 3d)').setRequired(true))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20).setRequired(true))
      .addStringOption(opt => opt.setName('prize').setDescription('Prize for the giveaway').setRequired(true))
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to host the giveaway in').addChannelTypes(ChannelType.GuildText).setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('end')
      .setDescription('End an active giveaway immediately')
      .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID of the giveaway').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('reroll')
      .setDescription('Reroll new winners for an ended giveaway')
      .addStringOption(opt => opt.setName('message_id').setDescription('The Message ID of the giveaway').setRequired(true))
  );

export async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    const durationStr = interaction.options.getString('duration');
    const winnersCount = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const durationMs = ms(durationStr);
    if (!durationMs || durationMs < 5000) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Please provide a valid duration like `10m`, `1h`, or `2d`.')], ephemeral: true });
    }

    const endAt = Date.now() + durationMs;
    const endTimestamp = Math.floor(endAt / 1000);

    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('?? GIVEAWAY EVENT ??')
      .setDescription(`**Prize:** \`${prize}\`\n\n**Winners:** **${winnersCount}**\n**Hosted By:** ${interaction.user}\n**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)`)
      .setFooter({ text: `React with button below to enter! ? ${winnersCount} Winner(s)` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('Enter Giveaway')
        .setEmoji('??')
        .setStyle(ButtonStyle.Success)
    );

    const msg = await channel.send({ content: '?? **NEW GIVEAWAY!** ??', embeds: [embed], components: [row] });

    db.createGiveaway({
      messageId: msg.id,
      channelId: channel.id,
      guildId: interaction.guildId,
      prize,
      winnersCount,
      endAt,
      hostedBy: interaction.user.id
    });

    return interaction.reply({ embeds: [successEmbed('Giveaway Launched', `Giveaway for **${prize}** has been posted in ${channel}!`)], ephemeral: true });
  }

  if (sub === 'end') {
    const messageId = interaction.options.getString('message_id');
    const gw = db.getGiveaway(messageId);

    if (!gw) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'No giveaway found with that Message ID.')], ephemeral: true });
    }

    await endGiveaway(client, gw);
    return interaction.reply({ embeds: [successEmbed('Giveaway Ended', 'Giveaway was ended immediately and winners chosen.')], ephemeral: true });
  }

  if (sub === 'reroll') {
    const messageId = interaction.options.getString('message_id');
    const gw = db.getGiveaway(messageId);

    if (!gw) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'No giveaway found with that Message ID.')], ephemeral: true });
    }

    const entries = gw.entries || [];
    if (entries.length === 0) {
      return interaction.reply({ content: '? No entries to reroll from.', ephemeral: true });
    }

    const winner = entries[Math.floor(Math.random() * entries.length)];
    const channel = await client.channels.fetch(gw.channelId).catch(() => null);
    if (channel) {
      channel.send(`?? **GIVEAWAY REROLL:** The new winner for **${gw.prize}** is <@${winner}>! Congratulations! ??`);
    }
    return interaction.reply({ embeds: [successEmbed('Rerolled Winner', `New winner drawn: <@${winner}>`)], ephemeral: true });
  }
}
