import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Configure AutoMod security filters for the server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('antilink')
      .setDescription('Toggle Anti-Invite / Anti-Link protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('antispam')
      .setDescription('Toggle Anti-Spam rate limiting protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('anticaps')
      .setDescription('Toggle Anti-Caps protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('badwords')
      .setDescription('Add or remove words from the profanity filter')
      .addStringOption(opt => opt.setName('action').setDescription('Add, remove, or clear').setRequired(true).addChoices(
        { name: 'Add Word', value: 'add' },
        { name: 'Remove Word', value: 'remove' },
        { name: 'Clear All', value: 'clear' },
        { name: 'List Words', value: 'list' }
      ))
      .addStringOption(opt => opt.setName('word').setDescription('The word to add or remove').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('View current AutoMod security settings')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildSettings = db.getGuild(interaction.guildId);
  const automod = guildSettings.automod || { antiLink: false, antiSpam: false, antiCaps: false, badWords: [] };

  if (sub === 'antilink') {
    const enabled = interaction.options.getBoolean('enabled');
    automod.antiLink = enabled;
    db.updateGuild(interaction.guildId, { automod });
    return interaction.reply({ embeds: [successEmbed('AutoMod Anti-Link', 'Anti-Link protection has been **' + (enabled ? 'ENABLED' : 'DISABLED') + '**.')] });
  }

  if (sub === 'antispam') {
    const enabled = interaction.options.getBoolean('enabled');
    automod.antiSpam = enabled;
    db.updateGuild(interaction.guildId, { automod });
    return interaction.reply({ embeds: [successEmbed('AutoMod Anti-Spam', 'Anti-Spam protection has been **' + (enabled ? 'ENABLED' : 'DISABLED') + '**.')] });
  }

  if (sub === 'anticaps') {
    const enabled = interaction.options.getBoolean('enabled');
    automod.antiCaps = enabled;
    db.updateGuild(interaction.guildId, { automod });
    return interaction.reply({ embeds: [successEmbed('AutoMod Anti-Caps', 'Anti-Caps protection has been **' + (enabled ? 'ENABLED' : 'DISABLED') + '**.')] });
  }

  if (sub === 'badwords') {
    const action = interaction.options.getString('action');
    const word = interaction.options.getString('word')?.toLowerCase().trim();

    if (action === 'add') {
      if (!word) return interaction.reply({ embeds: [errorEmbed('Missing Word', 'Please specify a word to add.')], ephemeral: true });
      if (!automod.badWords.includes(word)) automod.badWords.push(word);
      db.updateGuild(interaction.guildId, { automod });
      return interaction.reply({ embeds: [successEmbed('Word Added', 'Added `' + word + '` to the bad words list.')] });
    }

    if (action === 'remove') {
      if (!word) return interaction.reply({ embeds: [errorEmbed('Missing Word', 'Please specify a word to remove.')], ephemeral: true });
      automod.badWords = automod.badWords.filter(w => w !== word);
      db.updateGuild(interaction.guildId, { automod });
      return interaction.reply({ embeds: [successEmbed('Word Removed', 'Removed `' + word + '` from the bad words list.')] });
    }

    if (action === 'clear') {
      automod.badWords = [];
      db.updateGuild(interaction.guildId, { automod });
      return interaction.reply({ embeds: [successEmbed('Words Cleared', 'All bad words removed from filter.')] });
    }

    if (action === 'list') {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🚫 Blacklisted Bad Words')
            .setDescription(automod.badWords.length > 0 ? automod.badWords.map(w => '• `' + w + '`').join('\n') : '*No words blacklisted.*')
        ],
        ephemeral: true
      });
    }
  }

  if (sub === 'status') {
    const statusEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🛡️ AutoMod Protection Status')
      .addFields(
        { name: '🔗 Anti-Link / Anti-Invite', value: automod.antiLink ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '⚡ Anti-Spam Rate Limit', value: automod.antiSpam ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '🔠 Anti-Caps Filter', value: automod.antiCaps ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '🚫 Bad Words Blacklist', value: automod.badWords.length + ' words filtered', inline: true }
      )
      .setFooter({ text: 'Use /automod to toggle settings' })
      .setTimestamp();

    return interaction.reply({ embeds: [statusEmbed] });
  }
}
