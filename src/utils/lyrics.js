export async function getLyrics(trackName, artistName = '') {
  try {
    const cleanTrack = trackName
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/feat\..*$/i, '')
      .replace(/ft\..*$/i, '')
      .replace(/official video/i, '')
      .replace(/official audio/i, '')
      .replace(/lyrics/i, '')
      .trim();

    let url = 'https://lrclib.net/api/get?track_name=' + encodeURIComponent(cleanTrack);
    if (artistName && artistName !== 'Official Artist' && artistName !== 'Artist') {
      url += '&artist_name=' + encodeURIComponent(artistName);
    }

    let response = await fetch(url, { headers: { 'User-Agent': 'SauraXT-Discord-Bot/2.0' } });
    if (response.ok) {
      const data = await response.json();
      if (data && (data.plainLyrics || data.syncedLyrics)) {
        return {
          title: data.trackName || trackName,
          artist: data.artistName || artistName,
          lyrics: data.plainLyrics || data.syncedLyrics.replace(/\[\d+:\d+\.\d+\] /g, ''),
          synced: Boolean(data.syncedLyrics)
        };
      }
    }

    const searchUrl = 'https://lrclib.net/api/search?q=' + encodeURIComponent(cleanTrack + (artistName ? ' ' + artistName : ''));
    response = await fetch(searchUrl, { headers: { 'User-Agent': 'SauraXT-Discord-Bot/2.0' } });
    if (response.ok) {
      const list = await response.json();
      if (Array.isArray(list) && list.length > 0) {
        const best = list.find(item => item.plainLyrics || item.syncedLyrics) || list[0];
        if (best && (best.plainLyrics || best.syncedLyrics)) {
          return {
            title: best.trackName || trackName,
            artist: best.artistName || artistName,
            lyrics: best.plainLyrics || best.syncedLyrics.replace(/\[\d+:\d+\.\d+\] /g, ''),
            synced: Boolean(best.syncedLyrics)
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Lyrics fetch error:', err.message);
    return null;
  }
}