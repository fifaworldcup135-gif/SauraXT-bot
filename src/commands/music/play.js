import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import play from 'play-dl';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play any song, track, or stream in your voice channel')
  .addStringOption(opt => opt.setName('query').setDescription('Song name, YouTube URL, or Spotify/SoundCloud link').setRequired(true));

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      embeds: [errorEmbed('Voice Channel Required', 'You must join a Voice Channel before using `/play`!')],
      ephemeral: true
    });
  }

  await interaction.deferReply();
  const rawQuery = interaction.options.getString('query').trim();

  try {
    let searchQuery = rawQuery;
    let trackThumbnail = null;
    let trackTitle = null;
    let trackArtist = null;

    // 1. If YouTube URL, resolve exact title & metadata
    if (rawQuery.includes('youtube.com') || rawQuery.includes('youtu.be')) {
      const ytInfo = await play.video_basic_info(rawQuery).catch(() => null);
      if (ytInfo && ytInfo.video_details) {
        searchQuery = ytInfo.video_details.title;
        trackTitle = ytInfo.video_details.title;
        trackArtist = ytInfo.video_details.channel?.name || 'Artist';
        trackThumbnail = ytInfo.video_details.thumbnails[0]?.url;
      }
    }

    // 2. If Spotify URL, resolve exact song & artist
    if (rawQuery.includes('spotify.com')) {
      const spType = play.sp_validate(rawQuery);
      if (spType === 'track') {
        const spData = await play.spotify(rawQuery).catch(() => null);
        if (spData) {
          searchQuery = spData.name + ' ' + (spData.artists ? spData.artists.map(a => a.name).join(' ') : '');
          trackTitle = spData.name;
          trackArtist = spData.artists ? spData.artists[0]?.name : 'Artist';
          trackThumbnail = spData.thumbnail?.url;
        }
      }
    }

    // 3. Search high-quality audio stream provider with exact query
    let track = null;
    const scResults = await play.search(searchQuery, {
      source: { soundcloud: 'tracks' },
      limit: 5
    }).catch(() => []);

    if (scResults && scResults.length > 0) {
      const item = scResults[0];
      track = {
        title: trackTitle || item.name || item.title || searchQuery,
        url: item.url,
        duration: item.durationInSec ? Math.floor(item.durationInSec / 60) + ':' + (item.durationInSec % 60 < 10 ? '0' : '') + (item.durationInSec % 60) : 'HQ Audio',
        thumbnail: trackThumbnail || item.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png',
        artist: trackArtist || item.user?.name || 'Official Artist',
        requestedBy: interaction.user.id
      };
    } else {
      // Secondary search fallback
      const ytResults = await play.search(searchQuery, { limit: 1 }).catch(() => []);
      if (ytResults && ytResults.length > 0) {
        const item = ytResults[0];
        track = {
          title: item.title,
          url: item.url,
          duration: item.durationRaw,
          thumbnail: item.thumbnails[0]?.url,
          artist: item.channel?.name || 'Artist',
          requestedBy: interaction.user.id
        };
      }
    }

    if (!track) {
      return interaction.editReply({
        embeds: [errorEmbed('No Results Found', 'Could not find any playable audio for `' + rawQuery + '`. Try specifying the song and artist name!')]
      });
    }

    const queue = await musicManager.connectVoice(voiceChannel, interaction.channel);

    if (queue.isPlaying) {
      queue.queue.push(track);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('➕ Added to Queue (Position #' + queue.queue.length + ')')
            .setDescription('**[' + track.title + '](' + track.url + ')**')
            .setThumbnail(track.thumbnail)
            .addFields(
              { name: '👤 Artist / Channel', value: track.artist, inline: true },
              { name: '⏱️ Duration', value: track.duration, inline: true },
              { name: '🙋 Requested By', value: '<@' + interaction.user.id + '>', inline: true }
            )
            .setFooter({ text: 'Use /queue to see upcoming tracks' })
        ]
      });
    } else {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎵 Playing Track')
            .setDescription('**[' + track.title + '](' + track.url + ')** in **' + voiceChannel.name + '**')
            .setThumbnail(track.thumbnail)
            .addFields(
              { name: '👤 Artist', value: track.artist, inline: true },
              { name: '⏱️ Duration', value: track.duration, inline: true }
            )
        ]
      });

      musicManager.playTrack(interaction.guildId, track);
    }
  } catch (err) {
    console.error('Play command error:', err);
    return interaction.editReply({
      embeds: [errorEmbed('Playback Error', 'An error occurred while loading this song.')]
    });
  }
}