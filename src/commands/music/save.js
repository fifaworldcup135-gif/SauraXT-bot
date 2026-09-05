import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('save')
  .setDescription('Save the currently playing song details directly to your private DMs');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack) {
    return interaction.reply({
      embeds: [errorEmbed('Nothing Playing', 'There is no music currently playing to save!')],
      ephemeral: true
    });
  }

  const track = queue.currentTrack;
  const botName = interaction.client.user?.username || 'SauraXT';

  const dmEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setAuthor({
      name: 'Saved Track',
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(`🎵 ${track.title}`)
    .setURL(track.url)
    .addFields(
      { name: '👤 Artist / Author', value: track.artist || 'Unknown', inline: true },
      { name: '⏱️ Duration', value: `\`${track.duration || 'HQ'}\``, inline: true },
      { name: '🌐 Server', value: interaction.guild?.name || 'Server', inline: true }
    )
    .setFooter({
      text: `${botName} • Personal Music Library`,
      iconURL: interaction.client.user?.displayAvatarURL() || undefined
    })
    .setTimestamp();

  if (track.thumbnail) dmEmbed.setThumbnail(track.thumbnail);

  try {
    await interaction.user.send({ embeds: [dmEmbed] });
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription('📬 I have sent this song details to your **Direct Messages (DMs)**!')
      ],
      ephemeral: true
    });
  } catch (err) {
    return interaction.reply({
      embeds: [
        errorEmbed('DMs Closed', 'Could not send you a DM! Please open your Discord Privacy Settings to allow direct messages from server members.')
      ],
      ephemeral: true
    });
  }
}
