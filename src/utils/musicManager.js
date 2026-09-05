import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus 
} from "@discordjs/voice";
import play from "play-dl";
import { EmbedBuilder, PermissionFlagsBits, ActivityType } from "discord.js";
import { config } from "../config.js";
import { resolveMusicQuery } from "./urlResolver.js";
import { fetchLyrics } from "./lunarLyrics.js";
import { fetchTrackMetadata, getPlatformEmoji, getPlatformColor } from "./lunarMetadata.js";

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
        console.log("🎵 Lunar Audio Engine: Lossless streaming provider ready.");
      }
    } catch (err) {
      console.error("Lunar Audio Engine init error:", err.message);
    }
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        guildId,
        voiceChannel: null,
        textChannel: null,
        client: null,
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
        activeFilter: "filter_clear",
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
        return name.includes("vip") || 
               name.includes("booster") || 
               name.includes("nitro") || 
               name.includes("og") || 
               name.includes("owner") || 
               name.includes("ceo") || 
               name.includes("mod") || 
               name.includes("admin");
      });
    }
    return false;
  }

  isVipLounge(textChannel, voiceChannel, guildSettings = {}) {
    const vipVoiceId = guildSettings.vipMusic?.voiceChannelId;
    const vipTextId = guildSettings.vipMusic?.textChannelId;

    if (vipVoiceId && voiceChannel?.id === vipVoiceId) return true;
    if (vipTextId && textChannel?.id === vipTextId) return true;

    const tName = (textChannel?.name || "").toLowerCase();
    const tCategory = (textChannel?.parent?.name || "").toLowerCase();
    const vName = (voiceChannel?.name || "").toLowerCase();
    const vCategory = (voiceChannel?.parent?.name || "").toLowerCase();

    return tName.includes("vip") || tCategory.includes("vip") || vName.includes("vip") || vCategory.includes("vip");
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
      return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;
    };

    return "`" + formatS(currentSec) + "` " + "━".repeat(progressChars) + "🔘" + "━".repeat(emptyChars) + " `" + formatS(totalSec) + "`";
  }

  createControllerComponents() {
    return [];
  }

  createControllerButtons() {
    return [];
  }

  // 1:1 Exact Lunar Music Now Playing Embed (relentiousdragon/lunar-music trackStart.js)
  async createNowPlayingEmbed(track, queue = null) {
    const platformEmoji = getPlatformEmoji(track);
    const color = getPlatformColor(track);
    const artistName = track.artist || "Unknown Artist";

    // Fetch live Deezer metadata (artist avatar, release date) & lrclib synced lyrics
    const [lyrics, metadata] = await Promise.all([
      fetchLyrics(track).catch(() => null),
      fetchTrackMetadata(track.title, artistName).catch(() => null)
    ]);

    const footerIcon = metadata?.artistPfp || (queue?.client?.user?.displayAvatarURL() || "https://cdn-icons-png.flaticon.com/512/3844/3844724.png");
    let footerText = `${artistName}`;
    if (metadata?.releaseDate) {
      footerText += `  •  ${metadata.releaseDate}`;
    }

    const embed = new EmbedBuilder()
      .setTitle("Now Playing")
      .setDescription(`${platformEmoji} [${track.title}](${track.url})`)
      .addFields(
        { name: "Duration", value: `\`${track.duration || "00:00"}\``, inline: true },
        { name: "Requested By", value: `<@${track.requestedBy || "User"}>`, inline: true }
      );

    if (queue && queue.queue && queue.queue.length > 0) {
      const nextTrack = queue.queue[0];
      const nextTitle = nextTrack.title || nextTrack.name || "Unknown Track";
      const truncatedNextTitle = nextTitle.length > 25 ? nextTitle.substring(0, 23) + "..." : nextTitle;
      embed.addFields({ name: "Up Next", value: `\`${truncatedNextTitle}\``, inline: true });
    }

    if (lyrics) {
      embed.addFields({ name: "Lyrics", value: `\`\`\`\n${lyrics.slice(0, 1000)}\n\`\`\`` });
    }

    if (queue && queue.activeFilter && queue.activeFilter !== "filter_clear") {
      const filterNames = {
        filter_bassboost: "Bass Boost",
        filter_nightcore: "Nightcore",
        filter_vaporwave: "Vaporwave",
        filter_8d: "8D Audio",
        filter_tremolo: "Tremolo",
        filter_karaoke: "Karaoke"
      };
      embed.addFields({ name: "Active Effects", value: `\`${filterNames[queue.activeFilter] || queue.activeFilter}\``, inline: false });
    }

    embed.setColor(color)
      .setFooter({ text: footerText, iconURL: footerIcon });

    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    return embed;
  }

  async connectVoice(voiceChannel, textChannel) {
    const queue = this.getQueue(voiceChannel.guild.id);
    queue.voiceChannel = voiceChannel;
    queue.textChannel = textChannel;
    queue.client = voiceChannel.client;

    if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      queue.player = createAudioPlayer();
      queue.connection.subscribe(queue.player);

      // CRITICAL FIX FOR LOOP BUG:
      // In @discordjs/voice, listen only to stateChange from Playing -> Idle!
      // This prevents initial idle triggers, stop() loops, and spurious replays.
      queue.player.on("stateChange", (oldState, newState) => {
        if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
          if (queue.isLooping && queue.currentTrack) {
            this.playTrack(voiceChannel.guild.id, queue.currentTrack);
          } else if (queue.loopQueue && queue.currentTrack) {
            queue.queue.push(queue.currentTrack);
            this.playNext(voiceChannel.guild.id);
          } else {
            this.playNext(voiceChannel.guild.id);
          }
        }
      });

      queue.player.on("error", err => {
        console.error("Audio Player Error:", err);
        if (queue.textChannel) {
          queue.textChannel.send("⚠️ Audio playback glitch encountered. Skipping to next song...").catch(() => {});
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
        throw new Error("MISSING_PERMS: I need View Channel, Connect, and Speak permissions in `" + voiceChannel.name + "`! Please give SauraXT Administrator permissions in Server Settings.");
      }
    }

    const inVipLounge = this.isVipLounge(textChannel, voiceChannel, guildSettings);
    const isVip = this.isVipMember(member, guildSettings);

    if (inVipLounge && !isVip) {
      throw new Error("VIP_RESTRICTED: This channel is reserved exclusively for **VIP Members & Server Boosters** 💎! Non-VIP members can play music in public lounges like Squad VC or Chill Lounge.");
    }

    const queryResult = await resolveMusicQuery(rawQuery);
    const queue = await this.connectVoice(voiceChannel, textChannel);

    // CASE 1: PLAYLIST
    if (queryResult.type === "playlist") {
      const tracks = queryResult.tracks;
      if (!tracks || tracks.length === 0) {
        throw new Error("NO_RESULTS: Could not find any playable tracks in this playlist.");
      }

      const firstItem = tracks[0];
      const firstTrack = {
        title: firstItem.title,
        url: firstItem.url,
        streamUrl: firstItem.url,
        searchQuery: firstItem.searchQuery || firstItem.title,
        duration: firstItem.duration || "HQ",
        durationSec: firstItem.durationSec || 180,
        thumbnail: firstItem.thumbnail || queryResult.tracks[0]?.thumbnail || "https://cdn-icons-png.flaticon.com/512/3844/3844724.png",
        artist: firstItem.artist || "Artist",
        requestedBy: member.id,
        isVip: isVip,
        loungeName: voiceChannel.name
      };

      for (let i = 1; i < tracks.length; i++) {
        const item = tracks[i];
        queue.queue.push({
          title: item.title,
          url: item.url,
          streamUrl: item.url,
          searchQuery: item.searchQuery || item.title,
          duration: item.duration || "HQ",
          durationSec: item.durationSec || 180,
          thumbnail: item.thumbnail || firstTrack.thumbnail,
          artist: item.artist || "Artist",
          requestedBy: member.id,
          isVip: isVip,
          loungeName: voiceChannel.name
        });
      }

      if (queue.isPlaying) {
        queue.queue.unshift(firstTrack);
        return { status: "playlist", name: queryResult.name, count: tracks.length, track: firstTrack, isVip, queue };
      } else {
        await this.playTrack(voiceChannel.guild.id, firstTrack, false);
        return { status: "playing_playlist", name: queryResult.name, count: tracks.length, track: firstTrack, isVip, queue };
      }
    }

    // CASE 2: SINGLE TRACK
    let streamUrl = queryResult.url;
    let streamDurSec = queryResult.durationSec || 180;
    const searchTarget = queryResult.searchQuery || queryResult.title;

    if (queryResult.source === "spotify" || queryResult.source === "search" || queryResult.source === "web" || !streamUrl) {
      // Search SoundCloud Lossless first (preferring full-length tracks >= 60s)
      const scResults = await play.search(searchTarget, {
        source: { soundcloud: "tracks" },
        limit: 10
      }).catch(() => []);

      const fullSc = scResults.find(s => s.durationInSec && s.durationInSec >= 60);

      if (fullSc) {
        streamUrl = fullSc.url;
        streamDurSec = fullSc.durationInSec;
      } else {
        // Fallback to YouTube for guaranteed full-length official release
        const ytResults = await play.search(searchTarget, { limit: 5 }).catch(() => []);
        const fullYt = ytResults.find(y => y.durationInSec && y.durationInSec >= 60) || ytResults[0];
        if (fullYt) {
          streamUrl = fullYt.url;
          streamDurSec = fullYt.durationInSec || streamDurSec;
        } else if (scResults.length > 0) {
          streamUrl = scResults[0].url;
          streamDurSec = scResults[0].durationInSec || streamDurSec;
        }
      }
    }

    if (!streamUrl) {
      throw new Error("NO_RESULTS: Could not find any playable audio for `" + rawQuery + "`");
    }

    const durFormatted = `${Math.floor(streamDurSec / 60)}:${(streamDurSec % 60).toString().padStart(2, "0")}`;

    const track = {
      title: queryResult.title,
      url: queryResult.url || streamUrl,
      streamUrl: streamUrl,
      duration: durFormatted,
      durationSec: streamDurSec,
      thumbnail: queryResult.thumbnail || "https://cdn-icons-png.flaticon.com/512/3844/3844724.png",
      artist: queryResult.artist || "Artist",
      requestedBy: member.id,
      isVip: isVip,
      loungeName: voiceChannel.name
    };

    if (queue.isPlaying) {
      queue.queue.push(track);
      return { status: "queued", track, position: queue.queue.length, isVip, queue };
    } else {
      await this.playTrack(voiceChannel.guild.id, track, false);
      return { status: "playing", track, isVip, queue };
    }
  }

  async playTrack(guildId, track, sendCard = true) {
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

    // Set Lunar Voice Channel Status (Screenshot 4)
    if (queue.voiceChannel && queue.voiceChannel.setStatus) {
      const truncatedTitle = track.title.length > 30 ? track.title.slice(0, 30) + "..." : track.title;
      queue.voiceChannel.setStatus(`💿 Now Playing: ${truncatedTitle}`).catch(() => {});
    }

    // Set Lunar Discord Activity / Rich Presence (Screenshot 3)
    if (queue.client?.user?.setPresence) {
      queue.client.user.setPresence({
        activities: [{ name: `${track.artist} - ${track.title}`, type: ActivityType.Listening }],
        status: "online"
      });
    }

    try {
      let stream;
      const target = track.streamUrl || track.url;
      const isDirectStreamable = target && (target.includes("youtube.com") || target.includes("youtu.be") || target.includes("soundcloud.com"));

      if (isDirectStreamable) {
        try {
          stream = await play.stream(target);
        } catch (e) {
          console.warn("Direct stream attempt failed:", e.message);
        }
      }

      if (!stream) {
        const searchTarget = track.searchQuery || track.title || track.name;
        // Search SoundCloud first for tracks >= 60s (eliminates preview snippets)
        const scResults = await play.search(searchTarget, { source: { soundcloud: "tracks" }, limit: 10 }).catch(() => []);
        const fullSc = scResults.find(s => s.durationInSec && s.durationInSec >= 60);

        if (fullSc) {
          track.streamUrl = fullSc.url;
          track.durationSec = fullSc.durationInSec;
          track.duration = `${Math.floor(track.durationSec / 60)}:${(track.durationSec % 60).toString().padStart(2, "0")}`;
          stream = await play.stream(fullSc.url);
        } else {
          // Fallback to YouTube for full-length official track
          const ytResults = await play.search(searchTarget, { limit: 5 }).catch(() => []);
          const fullYt = ytResults.find(y => y.durationInSec && y.durationInSec >= 60) || ytResults[0];
          if (fullYt) {
            track.streamUrl = fullYt.url;
            track.durationSec = fullYt.durationInSec || track.durationSec;
            track.duration = `${Math.floor(track.durationSec / 60)}:${(track.durationSec % 60).toString().padStart(2, "0")}`;
            stream = await play.stream(fullYt.url);
          } else if (scResults.length > 0) {
            track.streamUrl = scResults[0].url;
            stream = await play.stream(scResults[0].url);
          } else {
            throw new Error("Could not find streamable track");
          }
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

      if (sendCard && queue.textChannel) {
        const embed = await this.createNowPlayingEmbed(track, queue);
        queue.textChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to stream audio:", err);
      if (queue.textChannel) {
        queue.textChannel.send("❌ Could not stream this track. Skipping...").catch(() => {});
      }
      this.playNext(guildId);
    }
  }

  async playNext(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.queue.length > 0) {
      const nextTrack = queue.queue.shift();
      await this.playTrack(guildId, nextTrack);
    } else if (queue.autoplay && queue.currentTrack) {
      // Autoplay feature: fetch related track
      if (queue.textChannel) {
        queue.textChannel.send("🎲 **Autoplay:** Finding similar song to keep the vibes going...").catch(() => {});
      }
      try {
        const query = queue.currentTrack.artist || queue.currentTrack.title;
        const related = await play.search(query, { source: { soundcloud: "tracks" }, limit: 10 }).catch(() => []);
        const filtered = related.filter(r => r.url !== queue.currentTrack.url && r.durationInSec && r.durationInSec >= 60);
        if (filtered.length > 0) {
          const item = filtered[Math.floor(Math.random() * filtered.length)];
          const durSec = item.durationInSec || 180;
          const autoTrack = {
            title: item.name || item.title,
            url: item.url,
            streamUrl: item.url,
            duration: Math.floor(durSec / 60) + ":" + (durSec % 60 < 10 ? "0" : "") + (durSec % 60),
            durationSec: durSec,
            thumbnail: item.thumbnail,
            artist: item.user?.name || "Recommended Artist",
            requestedBy: null,
            isVip: queue.currentTrack.isVip,
            loungeName: queue.voiceChannel?.name
          };
          return this.playTrack(guildId, autoTrack);
        }
      } catch (err) {
        console.error("Autoplay error:", err);
      }
      this.finishPlayback(guildId);
    } else {
      this.finishPlayback(guildId);
    }
  }

  // 1:1 Exact Lunar Music Session Summary Embed (relentiousdragon/lunar-music trackEnd.js)
  finishPlayback(guildId) {
    const queue = this.getQueue(guildId);
    if (!queue.isPlaying && !queue.currentTrack) return;

    const totalSeconds = Math.max(1, Math.round((Date.now() - queue.sessionStats.startTime) / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formattedDuration = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    const tracksPlayed = queue.sessionStats.tracksPlayed;

    queue.currentTrack = null;
    queue.isPlaying = false;
    queue.isLooping = false;
    queue.loopQueue = false;

    // Reset voice channel status (Screenshot 4)
    if (queue.voiceChannel && queue.voiceChannel.setStatus) {
      queue.voiceChannel.setStatus("").catch(() => {});
    }

    // Reset bot rich presence activity (Screenshot 3)
    if (queue.client?.user?.setPresence) {
      queue.client.user.setPresence({
        activities: [{ name: "music for the vibes", type: ActivityType.Playing }],
        status: "idle"
      });
    }

    // Send Lunar Session Summary Embed (Screenshot 2)
    if (queue.textChannel && tracksPlayed > 0) {
      const summaryEmbed = new EmbedBuilder()
        .setColor("#6A5ACD")
        .setTitle("💿 Session Summary")
        .setDescription("Your listening session has ended. Here's a quick recap:")
        .addFields(
          { name: "Songs Played", value: `\`${tracksPlayed}\``, inline: true },
          { name: "Total Time", value: `\`${formattedDuration}\``, inline: true }
        )
        .setFooter({ 
          text: "Lunar", 
          iconURL: queue.client?.user?.displayAvatarURL() || "https://cdn-icons-png.flaticon.com/512/3844/3844724.png" 
        })
        .setTimestamp();

      queue.textChannel.send({ embeds: [summaryEmbed] }).catch(() => {});
    }

    // Disconnect after 5m of idle time
    if (queue.idleTimer) clearTimeout(queue.idleTimer);
    queue.idleTimer = setTimeout(() => {
      if (!queue.isPlaying && queue.queue.length === 0) {
        this.stop(guildId);
      }
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

  skip(guildId) {
    const queue = this.getQueue(guildId);
    if (!queue.isPlaying && !queue.currentTrack) return false;
    if (queue.player) {
      queue.player.stop(true);
      return true;
    }
    return false;
  }

  pause(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && !queue.isPaused) {
      queue.player.pause();
      queue.isPaused = true;
      return true;
    }
    return false;
  }

  resume(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && queue.isPaused) {
      queue.player.unpause();
      queue.isPaused = false;
      return true;
    }
    return false;
  }

  setVolume(guildId, volume) {
    const queue = this.getQueue(guildId);
    queue.volume = Math.max(1, Math.min(150, volume));
    return queue.volume;
  }

  toggleAutoplay(guildId) {
    const queue = this.getQueue(guildId);
    queue.autoplay = !queue.autoplay;
    return queue.autoplay;
  }

  stop(guildId) {
    const queue = this.getQueue(guildId);
    this.finishPlayback(guildId);

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
