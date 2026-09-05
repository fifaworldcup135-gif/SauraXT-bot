import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('skipto')
  .setDescription('Skip directly to a specific song number in the queue')
  .addIntegerOption(opt =>
    opt.setName('position')
      .setDescription('The track number to skip to (check /queue)')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (queue.queue.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('Queue Empty', 'There are no upcoming songs in the queue to skip to!')],
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

  const position = interaction.options.getInteger('position');
  if (position > queue.queue.length) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Position', `Position must be between 1 and ${queue.queue.length}. Check \`/queue\`.`)],
      ephemeral: true
    });
  }

  const targetTrack = queue.queue[position - 1];
  const success = musicManager.skipTo(interaction.guildId, position);

  if (success) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('⏭️ Skipped To Song')
      .setDescription(`Jumped directly to song #${position}: **[${targetTrack.title}](${targetTrack.url})**!`)
      .setFooter({
        text: interaction.client.user?.username || 'SauraXT',
        iconURL: interaction.client.user?.displayAvatarURL() || undefined
      });
    return interaction.reply({ embeds: [embed] });
  } else {
    return interaction.reply({
      embeds: [errorEmbed('Skip Failed', 'Could not skip to that track position.')],
      ephemeral: true
    });
  }
}
