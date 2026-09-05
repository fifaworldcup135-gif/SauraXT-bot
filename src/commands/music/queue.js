import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';
import { getPlatformEmoji } from '../../utils/lunarMetadata.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Display the current music queue and upcoming tracks')
  .addIntegerOption(opt => 
    opt.setName('page')
      .setDescription('Page number of the queue')
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const queue = musicManager.getQueue(interaction.guildId);

  if (!queue.currentTrack && queue.queue.length === 0) {
    return interaction.reply({ 
      embeds: [errorEmbed('Queue Status', 'The queue is currently empty')], 
      ephemeral: true 
    });
  }

  const voiceChannelName = queue.voiceChannel?.name || interaction.member.voice.channel?.name || 'Voice Channel';
  const allTracks = [queue.currentTrack, ...queue.queue].filter(Boolean);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(allTracks.length / itemsPerPage));
  const requestedPage = interaction.options.getInteger('page') || 1;
  const page = Math.max(1, Math.min(requestedPage, totalPages));

  const startIdx = (page - 1) * itemsPerPage;
  const pageTracks = allTracks.slice(startIdx, startIdx + itemsPerPage);

  const currentPosSec = queue.startedAt ? Math.floor((Date.now() - queue.startedAt) / 1000) : 0;
  const formatSec = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const totalDurationSec = allTracks.reduce((acc, t) => acc + (t.durationSec || 180), 0);
  const totalDurationStr = formatSec(totalDurationSec);

  const loopEmoji = queue.isLooping ? ' 🔁' : '';

  const pageDescription = pageTracks.map((track, i) => {
    const globalIdx = startIdx + i;
    const name = track.title || 'Unknown Track';
    const truncatedName = name.length > 45 ? name.substring(0, 45) + '...' : name;
    const url = track.url || 'https://discord.com';
    const duration = track.duration || 'HQ';

    const timeInfo = globalIdx === 0
      ? `\`${formatSec(currentPosSec)}/${duration}\``
      : `\`${duration}\``;

    const trackLoop = (globalIdx === 0 && queue.isLooping) ? loopEmoji : '';
    return `**${globalIdx + 1}.** [${truncatedName}](${url})${trackLoop} - ${timeInfo}`;
  }).join('\n');

  const botName = interaction.client.user?.username || 'SauraXT';
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Upcoming Queue', iconURL: config.assets.logoGif })
    .setTitle(`🎧 Queue for ${voiceChannelName}`)
    .setDescription(pageDescription || 'No songs in queue')
    .setThumbnail(config.assets.vinyl)
    .setColor('#6A5ACD')
    .setFooter({ 
      text: `${botName}  •  Page ${page}/${totalPages}  •  Queue ${totalDurationStr}`,
      iconURL: interaction.client.user?.displayAvatarURL() || config.assets.logoGif
    });

  return interaction.reply({ embeds: [embed] });
}