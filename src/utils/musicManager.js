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
        currentTrack: null,
        isPlaying: false,
        isPaused: false,
        isLooping: false,
        volume: 100,
        idleTimer: null
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

  createControllerButtons(isPaused = false, isLooping = false, isVip = false) {
    const row = new ActionRowBuilder().addComponents(
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
        .setLabel('Stop & Leave')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setLabel('View Queue')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary)
    );
    return row;
  }

  createNowPlayingEmbed(track, isPaused = false, isLooping = false) {
    if (track.isVip) {
      return new EmbedBuilder()
        .setColor('#FFD700') // Luxury VIP Gold
        .setTitle('👑 VIP EXCLUSIVE LOUNGE • ' + (track.title || track.name))
        .setURL(track.url)
        .setThumbnail(track.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png')
        .addFields(
          { name: '💎 VIP Requester', value: track.requestedBy ? `<@${track.requestedBy}> ⭐ VIP Pass` : '👑 VIP Member', inline: true },
          { name: '🎙️ VIP Lounge', value: '`' + (track.loungeName || 'VIP Hangout') + '`', inline: true },
          { name: '⏱️ Duration', value: track.duration || 'HQ Audio', inline: true },
          { name: '🎚️ Audio Fidelity', value: '💎 `384kbps Ultra HD Lossless`', inline: true },
          { name: '👤 Artist / Channel', value: track.artist || track.channel || 'Official Studio Track', inline: true },
          { name: '⚡ VIP Priority', value: '`24/7 Dedicated VIP Stream`', inline: true }
        )
        .setFooter({ text: '💎 SAURAXT VIP Audio Suite • Status: ' + (isPaused ? 'Paused ⏸️' : 'Playing ▶️') + ' • Loop: ' + (isLooping ? 'ON 🔁' : 'OFF') })
        .setTimestamp();
    }

    return new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle('🎶 Now Playing: ' + (track.title || track.name))
      .setURL(track.url)
      .setThumbnail(track.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png')
      .addFields(
        { name: '👤 Artist / Channel', value: track.channel || track.artist || 'Official Track', inline: true },
        { name: '⏱️ Duration', value: track.duration || 'HQ Audio', inline: true },
        { name: '🙋 Requested By', value: track.requestedBy ? '<@' + track.requestedBy + '>' : 'DJ', inline: true }
      )
      .setFooter({ text: 'Status: ' + (isPaused ? 'Paused ⏸️' : 'Playing ▶️') + ' • Loop: ' + (isLooping ? 'ON 🔁' : 'OFF') })
      .setTimestamp();
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
    // 1. Check Voice Permissions
    const botMember = voiceChannel.guild.members.me;
    if (botMember) {
      const perms = voiceChannel.permissionsFor(botMember);
      if (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
        throw new Error('MISSING_PERMS: I need View Channel, Connect, and Speak permissions in `' + voiceChannel.name + '`! Please give SauraXT the Administrator permission in Server Settings.');
      }
    }

    // 2. VIP Lounge Protection Check
    const inVipLounge = this.isVipLounge(textChannel, voiceChannel, guildSettings);
    const isVip = this.isVipMember(member, guildSettings);

    if (inVipLounge && !isVip) {
      throw new Error('VIP_RESTRICTED: This channel is reserved exclusively for **VIP Members & Server Boosters** 💎! Non-VIP members can play music in public lounges like Squad VC or Chill Lounge.');
    }

    let searchQuery = rawQuery.trim();
    let trackThumbnail = null;
    let trackTitle = null;
    let trackArtist = null;

    // A. Resolve YouTube metadata if URL
    if (searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be')) {
      const ytInfo = await play.video_basic_info(searchQuery).catch(() => null);
      if (ytInfo && ytInfo.video_details) {
        searchQuery = ytInfo.video_details.title;
        trackTitle = ytInfo.video_details.title;
        trackArtist = ytInfo.video_details.channel?.name || 'Artist';
        trackThumbnail = ytInfo.video_details.thumbnails[0]?.url;
      }
    }

    // B. Resolve Spotify metadata if URL
    if (searchQuery.includes('spotify.com')) {
      const spType = play.sp_validate(searchQuery);
      if (spType === 'track') {
        const spData = await play.spotify(searchQuery).catch(() => null);
        if (spData) {
          searchQuery = spData.name + ' ' + (spData.artists ? spData.artists.map(a => a.name).join(' ') : '');
          trackTitle = spData.name;
          trackArtist = spData.artists ? spData.artists[0]?.name : 'Artist';
          trackThumbnail = spData.thumbnail?.url;
        }
      }
    }

    // C. Search High-Reliability Audio Provider
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
    queue.currentTrack = track;
    queue.isPlaying = true;
    queue.isPaused = false;

    if (queue.idleTimer) {
      clearTimeout(queue.idleTimer);
      queue.idleTimer = null;
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
        const embed = this.createNowPlayingEmbed(track, false, queue.isLooping);
        const row = this.createControllerButtons(false, queue.isLooping, track.isVip);
        queue.textChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to stream audio:', err);
      if (queue.textChannel) {
        queue.textChannel.send('❌ Could not stream this track. Skipping...').catch(() => {});
      }
      this.playNext(guildId);
    }
  }

  playNext(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.queue.length > 0) {
      const nextTrack = queue.queue.shift();
      this.playTrack(guildId, nextTrack);
    } else {
      queue.currentTrack = null;
      queue.isPlaying = false;

      if (queue.textChannel) {
        queue.textChannel.send('🎵 Queue has ended. Leaving in 5m if idle.').catch(() => {});
      }

      queue.idleTimer = setTimeout(() => {
        this.stop(guildId);
      }, 5 * 60 * 1000);
    }
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

  stop(guildId) {
    const queue = this.getQueue(guildId);
    queue.queue = [];
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