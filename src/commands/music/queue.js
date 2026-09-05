import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { config } from '../../config.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Display the current music queue and upcoming tracks');

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack && queue.queue.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('Empty Queue', 'There are no songs in the queue! Use `/play` to add music.')], ephemeral: true });
  }

  const current = queue.currentTrack;
  const list = queue.queue.slice(0, 10).map((t, idx) => {
    return '**' + (idx + 1) + '.** [' + t.title + '](' + t.url + ') — `' + (t.duration || 'Live') + '` | Requested by <@' + t.requestedBy + '>';
  });

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📜 Music Playback Queue')
    .addFields(
      { name: '🎶 Now Playing', value: current ? `**[${current.title}](${current.url})** (\`${current.duration || 'Live'}\`)` : '*None*', inline: false },
      { name: `📋 Upcoming Songs (${queue.queue.length} Total)`, value: list.length > 0 ? list.join('\n\n') : '*No upcoming tracks in queue.*', inline: false }
    )
    .setFooter({ text: `Loop: ${queue.isLooping ? 'ON 🔁' : 'OFF'} • Autoplay: ${queue.autoplay ? 'ON ✨' : 'OFF'} • Volume: ${queue.volume}%` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}