import play from 'play-dl';

export async function resolveMusicQuery(query) {
  const trimmed = query.trim();

  // 1. SPOTIFY TRACK
  const spotifyTrackMatch = trimmed.match(/https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-zA-Z0-9_-]+\/)?track\/([a-zA-Z0-9]+)/i);
  if (spotifyTrackMatch) {
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const cleanTitle = data.title;
        return {
          type: 'track',
          searchQuery: cleanTitle,
          title: cleanTitle,
          artist: 'Spotify',
          thumbnail: data.thumbnail_url,
          url: trimmed,
          source: 'spotify'
        };
      }
    } catch (e) {
      console.error('Spotify oEmbed error:', e);
    }
  }

  // 2. SPOTIFY ALBUM OR PLAYLIST
  const spotifyListMatch = trimmed.match(/https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-zA-Z0-9_-]+\/)?(album|playlist)\/([a-zA-Z0-9]+)/i);
  if (spotifyListMatch) {
    try {
      const kind = spotifyListMatch[1];
      const id = spotifyListMatch[2];
      const embedUrl = `https://open.spotify.com/embed/${kind}/${id}`;
      const res = await fetch(embedUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (res.ok) {
        const html = await res.text();
        const idx = html.indexOf('__NEXT_DATA__');
        if (idx !== -1) {
          const start = html.indexOf('{', idx);
          const end = html.indexOf('</script>', start);
          const jsonStr = html.substring(start, end);
          const data = JSON.parse(jsonStr);
          const entity = data.props?.pageProps?.state?.data?.entity;
          if (entity && Array.isArray(entity.trackList) && entity.trackList.length > 0) {
            if (entity.trackList.length === 1) {
              const t = entity.trackList[0];
              return {
                type: 'track',
                title: t.title,
                artist: t.subtitle || entity.name || 'Artist',
                searchQuery: `${t.title} ${t.subtitle || ''}`.trim(),
                duration: t.duration ? `${Math.floor(t.duration / 60000)}:${Math.floor((t.duration % 60000) / 1000).toString().padStart(2, '0')}` : 'HQ',
                durationSec: Math.floor((t.duration || 180000) / 1000),
                thumbnail: entity.coverArt?.sources?.[0]?.url || 'https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico',
                url: `https://open.spotify.com/track/${t.id || ''}`,
                source: 'spotify'
              };
            }

            const tracks = entity.trackList.map(t => ({
              title: t.title,
              artist: t.subtitle || entity.name || 'Artist',
              searchQuery: `${t.title} ${t.subtitle || ''}`.trim(),
              duration: t.duration ? `${Math.floor(t.duration / 60000)}:${Math.floor((t.duration % 60000) / 1000).toString().padStart(2, '0')}` : 'HQ',
              durationSec: Math.floor((t.duration || 180000) / 1000),
              thumbnail: entity.coverArt?.sources?.[0]?.url || 'https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico',
              url: `https://open.spotify.com/track/${t.id || ''}`,
              source: 'spotify'
            }));
            return {
              type: 'playlist',
              name: entity.name || 'Spotify Playlist',
              tracks,
              source: 'spotify'
            };
          }
        }
      }
    } catch (e) {
      console.error('Spotify playlist scrape error:', e);
    }
  }

  // 3. YOUTUBE PLAYLIST
  if (trimmed.includes('list=') && (trimmed.includes('youtube.com') || trimmed.includes('youtu.be'))) {
    try {
      const pl = await play.playlist_info(trimmed, { incomplete: true }).catch(() => null);
      if (pl && pl.videos && pl.videos.length > 0) {
        const tracks = pl.videos.map(v => {
          const rawTitle = v.title || 'YouTube Track';
          const cleanTitle = rawTitle
            .replace(/\(Official (Music )?Video\)/gi, '')
            .replace(/\(Official (Audio|Lyric Video)\)/gi, '')
            .replace(/\[(Official )?(Music )?Video\]/gi, '')
            .replace(/\(dir\..*?\)/gi, '')
            .replace(/\[.*?HD.*?\]/gi, '')
            .trim();
          return {
            title: rawTitle,
            cleanTitle: cleanTitle,
            artist: v.channel?.name || 'YouTube Creator',
            searchQuery: `${cleanTitle} ${v.channel?.name || ''}`.trim(),
            duration: v.durationRaw || 'HQ',
            durationSec: v.durationInSec || 180,
            thumbnail: v.thumbnails?.[0]?.url,
            url: v.url,
            source: 'youtube'
          };
        });
        return {
          type: 'playlist',
          name: pl.title || 'YouTube Playlist',
          tracks,
          source: 'youtube'
        };
      }
    } catch (e) {
      console.error('YouTube playlist error:', e);
    }
  }

  // 4. YOUTUBE SINGLE VIDEO / SHORTS / YOU.BE
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    const ytMatch = trimmed.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*)/);
    const videoId = (ytMatch && ytMatch[1].length === 11) ? ytMatch[1] : null;

    if (videoId) {
      const canonicalYtUrl = `https://www.youtube.com/watch?v=${videoId}`;
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalYtUrl)}&format=json`);
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          const rawTitle = oembed.title || 'YouTube Track';
          const author = oembed.author_name || 'YouTube Creator';
          const cleanTitle = rawTitle
            .replace(/\(Official (Music )?Video\)/gi, '')
            .replace(/\(Official (Audio|Lyric Video)\)/gi, '')
            .replace(/\[(Official )?(Music )?Video\]/gi, '')
            .replace(/\(dir\..*?\)/gi, '')
            .replace(/\[.*?HD.*?\]/gi, '')
            .trim();

          return {
            type: 'track',
            searchQuery: `${cleanTitle} ${author}`.trim(),
            title: rawTitle,
            cleanTitle: cleanTitle,
            artist: author,
            duration: 'HQ',
            durationSec: 180,
            thumbnail: oembed.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: canonicalYtUrl,
            source: 'youtube'
          };
        }
      } catch (e) {
        console.warn('YouTube oEmbed error, falling back:', e.message);
      }
    }

    try {
      const ytInfo = await play.video_basic_info(trimmed).catch(() => null);
      if (ytInfo && ytInfo.video_details) {
        const vd = ytInfo.video_details;
        const durSec = vd.durationInSec || 180;
        const cleanTitle = (vd.title || '')
          .replace(/\(Official (Music )?Video\)/gi, '')
          .replace(/\(Official (Audio|Lyric Video)\)/gi, '')
          .replace(/\[(Official )?(Music )?Video\]/gi, '')
          .replace(/\(dir\..*?\)/gi, '')
          .replace(/\[.*?HD.*?\]/gi, '')
          .trim();

        return {
          type: 'track',
          searchQuery: `${cleanTitle} ${vd.channel?.name || ''}`.trim(),
          title: vd.title,
          cleanTitle: cleanTitle,
          artist: vd.channel?.name || 'YouTube Creator',
          duration: vd.durationRaw || `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}`,
          durationSec: durSec,
          thumbnail: vd.thumbnails?.[0]?.url,
          url: vd.url,
          source: 'youtube'
        };
      }
    } catch (e) {
      console.error('YouTube video info error:', e);
    }
  }

  // 5. SOUNDCLOUD PLAYLIST / SET
  if (trimmed.includes('soundcloud.com') && trimmed.includes('/sets/')) {
    try {
      const scSet = await play.soundcloud(trimmed).catch(() => null);
      if (scSet && scSet.tracks) {
        const tracks = scSet.tracks.map(t => ({
          title: t.name || t.title,
          artist: t.user?.name || 'SoundCloud Artist',
          searchQuery: t.url,
          duration: t.durationInSec ? `${Math.floor(t.durationInSec / 60)}:${(t.durationInSec % 60).toString().padStart(2, '0')}` : 'HQ',
          durationSec: t.durationInSec || 180,
          thumbnail: t.thumbnail,
          url: t.url,
          source: 'soundcloud'
        }));
        return {
          type: 'playlist',
          name: scSet.name || 'SoundCloud Set',
          tracks,
          source: 'soundcloud'
        };
      }
    } catch (e) {
      console.error('SoundCloud set error:', e);
    }
  }

  // 6. SOUNDCLOUD SINGLE TRACK
  if (trimmed.includes('soundcloud.com')) {
    try {
      const scTrack = await play.soundcloud(trimmed).catch(() => null);
      if (scTrack) {
        const durSec = scTrack.durationInSec || 180;
        return {
          type: 'track',
          searchQuery: scTrack.url,
          title: scTrack.name || scTrack.title,
          artist: scTrack.user?.name || 'SoundCloud Artist',
          duration: `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}`,
          durationSec: durSec,
          thumbnail: scTrack.thumbnail,
          url: scTrack.url,
          source: 'soundcloud'
        };
      }
    } catch (e) {
      console.error('SoundCloud track error:', e);
    }
  }

  // 7. APPLE MUSIC / DEEZER / OTHER
  if (trimmed.includes('apple.com') || trimmed.includes('deezer.com')) {
    const parts = trimmed.split('?')[0].split('/').filter(Boolean);
    const potentialTitle = decodeURIComponent(parts[parts.length - 1] || '').replace(/[-_]/g, ' ');
    return {
      type: 'track',
      searchQuery: potentialTitle,
      title: potentialTitle || trimmed,
      artist: 'Music',
      thumbnail: null,
      url: trimmed,
      source: 'web'
    };
  }

  // 8. PLAIN TEXT KEYWORD SEARCH
  return {
    type: 'track',
    searchQuery: trimmed,
    title: trimmed,
    artist: null,
    thumbnail: null,
    url: null,
    source: 'search'
  };
}
