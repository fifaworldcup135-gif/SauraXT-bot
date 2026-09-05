import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('replay')
  .setDescription('Replay the currently playing track from the beginning');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack) {
    return interaction.reply({
      embeds: [errorEmbed('Nothing Playing', 'There is no track currently playing to replay!')],
      ephemeral: true
    });
  }

  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
    return interaction.reply({
      embeds: [errorEmbed('Permission Denied', 'You must be in the same voice channel as the bot to replay!')],
      ephemeral: true
    });
  }

  const track = queue.currentTrack;
  const success = musicManager.replay(interaction.guildId);

  if (success) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🔄 Replaying Track')
      .setDescription(`Restarting **[${track.title}](${track.url})** from the beginning!`)
      .setFooter({
        text: interaction.client.user?.username || 'SauraXT',
        iconURL: interaction.client.user?.displayAvatarURL() || undefined
      });
    return interaction.reply({ embeds: [embed] });
  } else {
    return interaction.reply({
      embeds: [errorEmbed('Replay Failed', 'Could not replay this track.')],
      ephemeral: true
    });
  }
}
