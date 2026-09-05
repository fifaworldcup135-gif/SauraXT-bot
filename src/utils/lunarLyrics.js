// Directly ported from https://github.com/relentiousdragon/lunar-music/blob/main/src/utils/lyrics.js

export async function fetchLyrics(track) {
  try {
    let title = (track.title || '').toString();
    const artist = (track.artist || track.author || '').toString();
    const trackLen = (track.durationSec ? track.durationSec * 1000 : 0);
    const duration = Math.floor(trackLen / 1000);

    title = title
      .replace(/\(Official Video\)/gi, '')
      .replace(/\(Official Audio\)/gi, '')
      .replace(/\(Lyric Video\)/gi, '')
      .replace(/\(Lyrics\)/gi, '')
      .replace(/\[.*\]/g, '')
      .trim();

    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&duration=${duration}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.syncedLyrics && !data.plainLyrics) return null;

    if (data.syncedLyrics) {
      const lines = data.syncedLyrics.split('\n').map(line => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (!match) return null;
        return match[3].trim();
      }).filter(Boolean);
      return lines.slice(0, 4).join('\n');
    }

    if (data.plainLyrics) {
      const lines = data.plainLyrics.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.slice(0, 4).join('\n');
    }

    return null;
  } catch (err) {
    return null;
  }
}
