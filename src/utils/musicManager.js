import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus 
} from '@discordjs/voice';
import play from 'play-dl';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';

class MusicManager {
  constructor() {
    this.queues = new Map(); // guildId => QueueObject
    this.initSoundCloud();
  }

  async initSoundCloud() {
    try {
      const clientId = await play.getFreeClientID();
      if (clientId) {
        await play.setToken({ soundcloud: { client_id: clientId } });
        console.log('🎵 Audio Streaming Engine initialized with high-quality stream provider.');
      }
    } catch (err) {
      console.error('Audio engine init error:', err.message);
    }
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        guildId,
        voiceChannel: null,
        textChannel: null,
        connection: null,
        player: null,
        queue: [],
        previousTracks: [],
        currentTrack: null,
        isPlaying: false,
        isPaused: false,
        isLooping: false,
        loopQueue: false,
        autoplay: false,
        volume: 100,
        startedAt: 0,
        idleTimer: null,
        sessionStats: {
          startTime: Date.now(),
          tracksPlayed: 0
        }
      });
    }
    return this.queues.get(guildId);
  }

  isVipMember(member, guildSettings = {}) {
    if (!member) return false;
    if (member.permissions && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild))) {
      return true;
    }
    const vipRoleId = guildSettings.vipMusic?.roleId;
    if (vipRoleId && member.roles?.cache?.has(vipRoleId)) {
      return true;
    }
    if (member.roles?.cache) {
      return member.roles.cache.some(r => {
        const name = r.name.toLowerCase();
        return name.includes('vip') || 
               name.includes('booster') || 
               name.includes('nitro') || 
               name.includes('og') || 
               name.includes('owner') || 
               name.includes('ceo') || 
               name.includes('mod') || 
               name.includes('admin');
      });
    }
    return false;
  }

  isVipLounge(textChannel, voiceChannel, guildSettings = {}) {
    const vipVoiceId = guildSettings.vipMusic?.voiceChannelId;
    const vipTextId = guildSettings.vipMusic?.textChannelId;

    if (vipVoiceId && voiceChannel?.id === vipVoiceId) return true;
    if (vipTextId && textChannel?.id === vipTextId) return true;

    const tName = (textChannel?.name || '').toLowerCase();
    const tCategory = (textChannel?.parent?.name || '').toLowerCase();
    const vName = (voiceChannel?.name || '').toLowerCase();
    const vCategory = (voiceChannel?.parent?.name || '').toLowerCase();

    return tName.includes('vip') || tCategory.includes('vip') || vName.includes('vip') || vCategory.includes('vip');
  }

  getProgressBar(currentSec, totalSec = 180, barSize = 14) {
    if (isNaN(currentSec)) currentSec = 0;
    if (isNaN(totalSec) || totalSec <= 0) totalSec = 180;
    const progress = Math.min(Math.max(currentSec / totalSec, 0), 1);
    const progressChars = Math.round(barSize * progress);
    const emptyChars = barSize - progressChars;

    const formatS = s => {
      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    };

    const bar = '▬'.repeat(Math.max(progressChars - 1, 0)) + '🔘' + '▬'.repeat(emptyChars);
    return '`' + formatS(currentSec) + '` ' + bar + ' `' + formatS(totalSec) + '`';
  }

  createControllerButtons(isPaused = false, isLooping = false, isVip = false, hasPrevious = false) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_back')
        .setLabel('Back')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasPrevious),
      new ButtonBuilder()
        .setCustomId('music_pause')
        .setLabel(isPaused ? 'Resume' : 'Pause')
        .setEmoji(isPaused ? '▶️' : '⏸️')
        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setLabel('Skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_loop')
        .setLabel(isLooping ? 'Loop: ON' : 'Loop: OFF')
        .setEmoji('🔁')
        .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setLabel('Stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_fav')
        .setLabel('Favorite')
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setLabel('Queue')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_lyrics')
        .setLabel('Lyrics')
        .setEmoji('🎤')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setLabel('Shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_boost')
        .setLabel('Boost')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
  }

  createNowPlayingEmbed(track, isPaused = false, isLooping = false, queue = null) {
    const elapsedSec = queue && queue.startedAt ? Math.floor((Date.now() - queue.startedAt) / 1000) : 0;
    const totalSec = track.durationSec || 210;
    const progressBar = this.getProgressBar(elapsedSec, totalSec);

    let embedColor = '#5865F2'; // Lunar Blue
    if (track.isVip) embedColor = '#FFD700'; // VIP Gold
    else if (track.url?.includes('spotify')) embedColor = '#1DB954';
    else if (track.url?.includes('soundcloud')) embedColor = '#FF5500';

    const upNextTrack = queue && queue.queue.length > 0 ? queue.queue[0] : null;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(track.isVip ? '👑 VIP EXCLUSIVE • ' + (track.title || track.name) : '🎶 Now Playing • ' + (track.title || track.name))
      .setURL(track.url)
      .setThumbnail(track.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png')
      .setDescription(
        '👤 **Artist:** `' + (track.artist || track.channel || 'Official Artist') + '`\n' +
        '⏱️ **Progress:**\n' + progressBar + '\n'
      )
      .addFields(
        { name: '🔊 Audio Fidelity', value: track.isVip ? '💎 `384kbps Ultra HD`' : '⚡ `320kbps Lossless`', inline: true },
        { name: '🙋 Requester', value: track.requestedBy ? `<@${track.requestedBy}>` : 'DJ', inline: true },
        { name: '🔁 Loop Mode', value: isLooping ? '`Track Loop 🔂`' : '`Off`', inline: true },
        { name: '📻 Up Next', value: upNextTrack ? `**[${upNextTrack.title}](${upNextTrack.url})** (\`${upNextTrack.duration || 'HQ'}\`)` : '`End of queue. Autoplay active.`', inline: false }
      )
      .setFooter({ text: '🌙 SauraXT & Lunar Audio Suite • Status: ' + (isPaused ? 'Paused ⏸️' : 'Playing ▶️') })
      .setTimestamp();

    return embed;
  }

  async connectVoice(voiceChannel, textChannel) {
    const queue = this.getQueue(voiceChannel.guild.id);
    queue.voiceChannel = voiceChannel;
    queue.textChannel = textChannel;

    if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      queue.player = createAudioPlayer();
      queue.connection.subscribe(queue.player);

      queue.player.on(AudioPlayerStatus.Idle, () => {
        if (queue.isLooping && queue.currentTrack) {
          this.playTrack(voiceChannel.guild.id, queue.currentTrack);
        } else {
          this.playNext(voiceChannel.guild.id);
        }
      });

      queue.player.on('error', err => {
        console.error('Audio Player Error:', err);
        if (queue.textChannel) {
          queue.textChannel.send('⚠️ Audio playback glitch encountered. Skipping to next song...').catch(() => {});
        }
        this.playNext(voiceChannel.guild.id);
      });
    }

    return queue;
  }

  async resolveAndPlay(voiceChannel, textChannel, rawQuery, member, guildSettings = {}) {
    const botMember = voiceChannel.guild.members.me;
    if (botMember) {
      const perms = voiceChannel.permissionsFor(botMember);
      if (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
        throw new Error('MISSING_PERMS: I need View Channel, Connect, and Speak permissions in `' + voiceChannel.name + '`! Please give SauraXT Administrator permissions in Server Settings.');
      }
    }

    const inVipLounge = this.isVipLounge(textChannel, voiceChannel, guildSettings);
    const isVip = this.isVipMember(member, guildSettings);

    if (inVipLounge && !isVip) {
      throw new Error('VIP_RESTRICTED: This channel is reserved exclusively for **VIP Members & Server Boosters** 💎! Non-VIP members can play music in public lounges like Squad VC or Chill Lounge.');
    }

    let searchQuery = rawQuery.trim();
    let trackThumbnail = null;
    let trackTitle = null;
    let trackArtist = null;
    let trackDurationSec = 180;

    if (searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be')) {
      const ytInfo = await play.video_basic_info(searchQuery).catch(() => null);
      if (ytInfo && ytInfo.video_details) {
        searchQuery = ytInfo.video_details.title;
        trackTitle = ytInfo.video_details.title;
        trackArtist = ytInfo.video_details.channel?.name || 'Artist';
        trackThumbnail = ytInfo.video_details.thumbnails[0]?.url;
        trackDurationSec = ytInfo.video_details.durationInSec || 180;
      }
    }

    if (searchQuery.includes('spotify.com')) {
      const spType = play.sp_validate(searchQuery);
      if (spType === 'track') {
        const spData = await play.spotify(searchQuery).catch(() => null);
        if (spData) {
          searchQuery = spData.name + ' ' + (spData.artists ? spData.artists.map(a => a.name).join(' ') : '');
          trackTitle = spData.name;
          trackArtist = spData.artists ? spData.artists[0]?.name : 'Artist';
          trackThumbnail = spData.thumbnail?.url;
          trackDurationSec = spData.durationInSec || 180;
        }
      }
    }

    let track = null;
    const scResults = await play.search(searchQuery, {
      source: { soundcloud: 'tracks' },
      limit: 5
    }).catch(() => []);

    if (scResults && scResults.length > 0) {
      const item = scResults[0];
      const durSec = item.durationInSec || trackDurationSec || 180;
      track = {
        title: trackTitle || item.name || item.title || searchQuery,
        url: item.url,
        duration: Math.floor(durSec / 60) + ':' + (durSec % 60 < 10 ? '0' : '') + (durSec % 60),
        durationSec: durSec,
        thumbnail: trackThumbnail || item.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png',
        artist: trackArtist || item.user?.name || 'Official Artist',
        requestedBy: member.id,
        isVip: isVip,
        loungeName: voiceChannel.name
      };
    } else {
      const ytResults = await play.search(searchQuery, { limit: 1 }).catch(() => []);
      if (ytResults && ytResults.length > 0) {
        const item = ytResults[0];
        track = {
          title: item.title,
          url: item.url,
          duration: item.durationRaw,
          durationSec: item.durationInSec || 180,
          thumbnail: item.thumbnails[0]?.url,
          artist: item.channel?.name || 'Artist',
          requestedBy: member.id,
          isVip: isVip,
          loungeName: voiceChannel.name
        };
      }
    }

    if (!track) {
      throw new Error('NO_RESULTS: Could not find any playable audio for `' + rawQuery + '`');
    }

    const queue = await this.connectVoice(voiceChannel, textChannel);

    if (queue.isPlaying) {
      queue.queue.push(track);
      return { status: 'queued', track, position: queue.queue.length, isVip };
    } else {
      this.playTrack(voiceChannel.guild.id, track);
      return { status: 'playing', track, isVip };
    }
  }

  async playTrack(guildId, track) {
    const queue = this.getQueue(guildId);
    if (queue.currentTrack) {
      queue.previousTracks.push(queue.currentTrack);
      if (queue.previousTracks.length > 20) queue.previousTracks.shift();
    }

    queue.currentTrack = track;
    queue.isPlaying = true;
    queue.isPaused = false;
    queue.startedAt = Date.now();
    queue.sessionStats.tracksPlayed++;

    if (queue.idleTimer) {
      clearTimeout(queue.idleTimer);
      queue.idleTimer = null;
    }

    // Set Lunar Voice Channel Status
    if (queue.voiceChannel && queue.voiceChannel.setStatus) {
      queue.voiceChannel.setStatus('🎶 ' + (track.title.length > 45 ? track.title.slice(0, 42) + '...' : track.title)).catch(() => {});
    }

    try {
      let stream;
      try {
        stream = await play.stream(track.url);
      } catch (e) {
        const fallbackResults = await play.search(track.title || track.name, { source: { soundcloud: 'tracks' }, limit: 1 });
        if (fallbackResults.length > 0) {
          stream = await play.stream(fallbackResults[0].url);
        } else {
          throw e;
        }
      }

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(queue.volume / 100);
      }

      queue.player.play(resource);

      if (queue.textChannel) {
        const embed = this.createNowPlayingEmbed(track, false, queue.isLooping, queue);
        const components = this.createControllerButtons(false, queue.isLooping, track.isVip, queue.previousTracks.length > 0);
        queue.textChannel.send({ embeds: [embed], components }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to stream audio:', err);
      if (queue.textChannel) {
        queue.textChannel.send('❌ Could not stream this track. Skipping...').catch(() => {});
      }
      this.playNext(guildId);
    }
  }

  async playNext(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.queue.length > 0) {
      const nextTrack = queue.queue.shift();
      this.playTrack(guildId, nextTrack);
    } else if (queue.autoplay && queue.currentTrack) {
      // Autoplay feature: fetch related track
      if (queue.textChannel) {
        queue.textChannel.send('🎲 **Autoplay:** Finding similar song to keep the vibes going...').catch(() => {});
      }
      try {
        const query = queue.currentTrack.artist || queue.currentTrack.title;
        const related = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 5 }).catch(() => []);
        const filtered = related.filter(r => r.url !== queue.currentTrack.url);
        if (filtered.length > 0) {
          const item = filtered[Math.floor(Math.random() * filtered.length)];
          const durSec = item.durationInSec || 180;
          const autoTrack = {
            title: item.name || item.title,
            url: item.url,
            duration: Math.floor(durSec / 60) + ':' + (durSec % 60 < 10 ? '0' : '') + (durSec % 60),
            durationSec: durSec,
            thumbnail: item.thumbnail,
            artist: item.user?.name || 'Recommended Artist',
            requestedBy: null,
            isVip: queue.currentTrack.isVip,
            loungeName: queue.voiceChannel?.name
          };
          return this.playTrack(guildId, autoTrack);
        }
      } catch (err) {
        console.error('Autoplay error:', err);
      }
      this.finishPlayback(guildId);
    } else {
      this.finishPlayback(guildId);
    }
  }

  finishPlayback(guildId) {
    const queue = this.getQueue(guildId);
    queue.currentTrack = null;
    queue.isPlaying = false;

    // Reset voice channel status
    if (queue.voiceChannel && queue.voiceChannel.setStatus) {
      queue.voiceChannel.setStatus('').catch(() => {});
    }

    if (queue.textChannel) {
      const sessionMinutes = Math.max(1, Math.round((Date.now() - queue.sessionStats.startTime) / 60000));
      const summaryEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📊 Music Session Ended')
        .setDescription(
          'Queue is finished! Leaving the voice channel in 5m if idle.\n\n' +
          '🎵 **Tracks Played:** `' + queue.sessionStats.tracksPlayed + '`\n' +
          '⏱️ **Session Duration:** `' + sessionMinutes + ' min`\n' +
          '💡 *Tip: Use `/autoplay` to keep music playing indefinitely!*'
        )
        .setFooter({ text: 'SauraXT & Lunar Audio Engine' })
        .setTimestamp();

      queue.textChannel.send({ embeds: [summaryEmbed] }).catch(() => {});
    }

    queue.idleTimer = setTimeout(() => {
      this.stop(guildId);
    }, 5 * 60 * 1000);
  }

  playPrevious(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.previousTracks.length === 0) return false;
    const prev = queue.previousTracks.pop();
    if (queue.currentTrack) {
      queue.queue.unshift(queue.currentTrack);
    }
    this.playTrack(guildId, prev);
    return prev;
  }

  shuffle(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.queue.length < 2) return false;
    for (let i = queue.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.queue[i], queue.queue[j]] = [queue.queue[j], queue.queue[i]];
    }
    return true;
  }

  clearQueue(guildId) {
    const queue = this.getQueue(guildId);
    const count = queue.queue.length;
    queue.queue = [];
    return count;
  }

  removeTrack(guildId, index) {
    const queue = this.getQueue(guildId);
    if (index < 0 || index >= queue.queue.length) return null;
    const removed = queue.queue.splice(index, 1);
    return removed[0];
  }

  moveTrack(guildId, fromIndex, toIndex) {
    const queue = this.getQueue(guildId);
    if (fromIndex < 0 || fromIndex >= queue.queue.length || toIndex < 0 || toIndex >= queue.queue.length) return false;
    const [track] = queue.queue.splice(fromIndex, 1);
    queue.queue.splice(toIndex, 0, track);
    return true;
  }

  skip(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player) {
      queue.player.stop();
      return true;
    }
    return false;
  }

  pause(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && queue.isPlaying && !queue.isPaused) {
      queue.player.pause();
      queue.isPaused = true;
      return true;
    }
    return false;
  }

  resume(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && queue.isPlaying && queue.isPaused) {
      queue.player.unpause();
      queue.isPaused = false;
      return true;
    }
    return false;
  }

  toggleAutoplay(guildId) {
    const queue = this.getQueue(guildId);
    queue.autoplay = !queue.autoplay;
    return queue.autoplay;
  }

  stop(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.voiceChannel && queue.voiceChannel.setStatus) {
      queue.voiceChannel.setStatus('').catch(() => {});
    }

    queue.queue = [];
    queue.previousTracks = [];
    queue.currentTrack = null;
    queue.isPlaying = false;
    queue.isPaused = false;
    queue.isLooping = false;

    if (queue.player) {
      queue.player.stop(true);
    }

    if (queue.connection) {
      queue.connection.destroy();
      queue.connection = null;
    }

    this.queues.delete(guildId);
  }
}

export const musicManager = new MusicManager();