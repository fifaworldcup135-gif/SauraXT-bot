import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus 
} from '@discordjs/voice';
import play from 'play-dl';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

  createControllerButtons(isPaused = false, isLooping = false) {
    return new ActionRowBuilder().addComponents(
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
  }

  createNowPlayingEmbed(track, isPaused = false, isLooping = false) {
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

      // Handle song finish
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
          queue.textChannel.send('⚠️ Audio glitch encountered. Skipping to next song...').catch(() => {});
        }
        this.playNext(voiceChannel.guild.id);
      });
    }

    return queue;
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
        // Fallback search
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
        const row = this.createControllerButtons(false, queue.isLooping);
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

      // Auto-leave after 5 minutes of inactivity
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