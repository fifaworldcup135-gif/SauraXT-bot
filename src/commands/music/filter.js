import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('filter')
  .setDescription('Apply audio effects and filters (Nightcore, Vaporwave, Bassboost, etc.)')
  .addStringOption(opt =>
    opt.setName('effect')
      .setDescription('The audio filter effect to toggle or apply')
      .setRequired(true)
      .addChoices(
        { name: '🎵 Nightcore (Fast & High Pitch)', value: 'nightcore' },
        { name: '🌊 Vaporwave (Slow & Reverb)', value: 'vaporwave' },
        { name: '🔊 Bass Boost', value: 'bassboost' },
        { name: '🎧 8D Audio (Rotating Sound)', value: '8d' },
        { name: '✨ Clear All Filters', value: 'clear' }
      )
  );

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack) {
    return interaction.reply({
      embeds: [errorEmbed('Nothing Playing', 'Start something first before applying audio filters!')],
      ephemeral: true
    });
  }

  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
    return interaction.reply({
      embeds: [errorEmbed('Permission Denied', 'You must be in the same voice channel as the bot!')],
      ephemeral: true
    });
  }

  const effect = interaction.options.getString('effect');
  const effectNames = {
    nightcore: 'Nightcore',
    vaporwave: 'Vaporwave',
    bassboost: 'Bass Boost',
    '8d': '8D Audio',
    clear: 'Clear Filters'
  };

  const displayName = effectNames[effect] || effect;

  if (effect === 'clear') {
    queue.activeFilter = 'none';
    const embed = new EmbedBuilder()
      .setTitle('▶️ Audio Filters Cleared')
      .setDescription('All active sound effects have been disabled.')
      .setColor('#00FF00')
      .setFooter({ text: 'Lunar' });
    return interaction.reply({ embeds: [embed] });
  }

  const isEnabled = queue.activeFilter !== effect;
  queue.activeFilter = isEnabled ? effect : 'none';

  const embed = new EmbedBuilder()
    .setTitle(`▶️ ${displayName} ${isEnabled ? 'Enabled' : 'Disabled'}`)
    .setDescription(`${displayName} filter has been **${isEnabled ? 'enabled' : 'disabled'}**.`)
    .setColor(isEnabled ? '#00FF00' : '#FF0000')
    .setFooter({ text: 'Lunar' });

  return interaction.reply({ embeds: [embed] });
}
