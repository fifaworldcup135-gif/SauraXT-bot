import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('247')
  .setDescription('Toggle 24/7 Voice Channel Stay mode (prevents bot from disconnecting)');

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel) {
    return interaction.reply({
      embeds: [errorEmbed('Voice Channel Required', 'You must be in a voice channel to toggle 24/7 mode!')],
      ephemeral: true
    });
  }

  const isEnabled = musicManager.toggle247(interaction.guildId);
  const botName = interaction.client.user?.username || 'SauraXT';

  const embed = new EmbedBuilder()
    .setColor(isEnabled ? '#00FF00' : '#FFA500')
    .setTitle(`📻 24/7 Mode: ${isEnabled ? 'ENABLED' : 'DISABLED'}`)
    .setDescription(
      isEnabled
        ? `**${botName}** will now stay connected to **${voiceChannel.name}** 24/7, even when music ends.`
        : `**${botName}** will now disconnect after 5 minutes of idle time when the queue finishes.`
    )
    .setFooter({
      text: `${botName} • 24/7 Voice Engine`,
      iconURL: interaction.client.user?.displayAvatarURL() || undefined
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
