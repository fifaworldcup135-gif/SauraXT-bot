// Directly ported from https://github.com/relentiousdragon/lunar-music/blob/main/src/utils/metadata.js

const metadataCache = new Map();
const METADATA_TTL = 24 * 60 * 60 * 1000;

export async function fetchTrackMetadata(trackTitle, artistName) {
  if (!trackTitle || !artistName || artistName === 'Unknown Artist' || artistName === 'Artist') return null;
  const cacheKey = `${trackTitle.toLowerCase()}:::${artistName.toLowerCase()}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  try {
    const primaryArtist = artistName.split(/[,&]|\s+ft\.|\s+feat\./i)[0].trim();
    const cleanTitle = trackTitle.split(/[([]/)[0].trim();
    const url = `https://api.deezer.com/search?q=track:"${encodeURIComponent(cleanTitle)}" artist:"${encodeURIComponent(primaryArtist)}"`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      const track = data.data[0];
      let releaseDate = track.release_date;

      if (!releaseDate) {
        try {
          const fullTrackRes = await fetch(`https://api.deezer.com/track/${track.id}`);
          if (fullTrackRes.ok) {
            const fullTrack = await fullTrackRes.json();
            releaseDate = fullTrack.release_date;
          }
        } catch {}
      }

      const value = {
        artistPfp: track.artist?.picture_medium || track.artist?.picture || null,
        releaseDate: releaseDate || null
      };
      metadataCache.set(cacheKey, { value, expiresAt: Date.now() + METADATA_TTL });
      return value;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getPlatformEmoji(track) {
  const url = (track?.url || track?.streamUrl || '').toLowerCase();
  if (url.includes('music.youtube') || url.includes('music.youtu.be')) return '🔴';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '🔴';
  if (url.includes('spotify.com')) return '🟢';
  if (url.includes('soundcloud.com')) return '🟠';
  if (url.includes('deezer.com')) return '🟣';
  if (url.includes('apple.com')) return '🍎';
  if (url.includes('tidal.com')) return '🎧';
  return '🎧';
}

export function getPlatformColor(track) {
  const url = (track?.url || track?.streamUrl || '').toLowerCase();
  if (url.includes('youtube') || url.includes('youtu.be')) return '#FF0000';
  if (url.includes('spotify')) return '#1DB954';
  if (url.includes('soundcloud')) return '#FF5500';
  if (url.includes('deezer')) return '#c830c6';
  if (url.includes('apple')) return '#ffc5c7';
  if (url.includes('tidal')) return '#ababab';
  return '#6A5ACD'; // Lunar default purple
}
