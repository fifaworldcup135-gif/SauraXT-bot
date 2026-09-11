import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export async function fetchLatestYouTubeVideo(identifier) {
  try {
    let channelId = identifier;

    // Handle known channel SauraXT directly
    if (identifier && identifier.toLowerCase().includes('sauraxt')) {
      channelId = 'UC24ouCJhbY6mCnbw5jQVfyQ';
    } else if (identifier && (identifier.startsWith('@') || !identifier.startsWith('UC'))) {
      const handleClean = identifier.replace('@', '');
      try {
        const pageRes = await fetch('https://www.youtube.com/@' + handleClean, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        if (pageRes.ok) {
          const pageText = await pageRes.text();
          const match = pageText.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/) ||
                        pageText.match(/itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})"/) ||
                        pageText.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/) ||
                        pageText.match(/channel\/(UC[a-zA-Z0-9_-]{22})/);
          if (match && match[1]) {
            channelId = match[1];
          }
        }
      } catch (e) {
        console.warn('Could not resolve handle ' + identifier + ':', e.message);
      }
    }

    const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (!res.ok) return null;

    const xml = await res.text();

    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;

    const entry = entryMatch[1];
    const videoIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const authorMatch = entry.match(/<name>(.*?)<\/name>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);

    if (!videoIdMatch || !titleMatch) return null;

    const videoId = videoIdMatch[1];
    const title = titleMatch[1];
    const author = authorMatch ? authorMatch[1] : 'SauraXT';
    const published = publishedMatch ? publishedMatch[1] : new Date().toISOString();

    // Check if the video is currently an active Live Stream or a regular Video Upload
    let isLive = false;
    try {
      const vidRes = await fetch('https://www.youtube.com/watch?v=' + videoId, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (vidRes.ok) {
        const vidHtml = await vidRes.text();
        isLive = vidHtml.includes('"isLive":true') || 
                 vidHtml.includes('"isLiveStream":true') || 
                 vidHtml.includes('"isLiveContent":true') ||
                 vidHtml.includes('"liveBroadcastDetails"');
      }
    } catch (e) {}

    return {
      channelId,
      videoId,
      title,
      author,
      published,
      isLive,
      url: 'https://www.youtube.com/watch?v=' + videoId,
      thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg'
    };
  } catch (err) {
    console.error('YouTube Fetch Error for ' + identifier + ':', err);
    return null;
  }
}

let isChecking = false;

export function startYouTubeNotifier(client) {
  console.log('🔴 YouTube Live Stream & Video Notifier worker started (checking every 60s)...');

  const checkFeeds = async () => {
    if (isChecking) {
      console.log('⏳ [YouTube Notifier] Previous check cycle is still running, skipping this tick.');
      return;
    }
    isChecking = true;

    try {
      if (!client.isReady()) return;

      for (const guild of client.guilds.cache.values()) {
        const guildData = db.getGuild(guild.id);
        let yt = guildData.youtube;

        // Auto-discover YouTube channels in guild if not configured or missing
        if (!yt || !yt.channelId || !yt.discordChannelId) {
          const ytVideoChannel = guild.channels.cache.find(c => 
            c.isTextBased() && (
              c.name.toLowerCase().includes('youtube') ||
              c.name.toLowerCase().includes('video')
            )
          );
          const ytStreamChannel = guild.channels.cache.find(c => 
            c.isTextBased() && (
              c.name.toLowerCase().includes('streaming') ||
              c.name.toLowerCase().includes('stream')
            )
          );

          const defaultChannel = ytVideoChannel || ytStreamChannel;
          if (defaultChannel) {
            yt = {
              channelId: yt?.channelId || 'UC24ouCJhbY6mCnbw5jQVfyQ',
              channelHandle: yt?.channelHandle || '@sauraXT',
              discordChannelId: defaultChannel.id,
              streamChannelId: ytStreamChannel ? ytStreamChannel.id : defaultChannel.id,
              videoChannelId: ytVideoChannel ? ytVideoChannel.id : defaultChannel.id,
              pingRole: yt?.pingRole || null,
              customMessage: yt?.customMessage || null,
              lastVideoId: yt?.lastVideoId || null,
              postedVideoIds: Array.isArray(yt?.postedVideoIds) ? yt.postedVideoIds : []
            };
            db.updateGuild(guild.id, { youtube: yt });
            console.log(`[YouTube Notifier] Auto-linked #${defaultChannel.name} in ${guild.name} to SauraXT (${yt.channelId})`);
          } else {
            continue;
          }
        }

        // Always ensure channelId is properly resolved
        let effectiveChannelId = yt.channelId;
        if (!effectiveChannelId || effectiveChannelId.toLowerCase().includes('sauraxt')) {
          effectiveChannelId = 'UC24ouCJhbY6mCnbw5jQVfyQ';
        }

        const latest = await fetchLatestYouTubeVideo(effectiveChannelId);
        if (!latest || !latest.videoId) continue;

        // Maintain array of posted videos to prevent repeat broadcasts
        const postedList = Array.isArray(yt.postedVideoIds) 
          ? [...yt.postedVideoIds] 
          : (yt.lastVideoId ? [yt.lastVideoId] : []);

        // 1. Check if already marked as posted in local database
        if (postedList.includes(latest.videoId) || yt.lastVideoId === latest.videoId) {
          continue;
        }

        // Target Discord channel
        const targetChannelId = latest.isLive 
          ? (yt.streamChannelId || yt.discordChannelId) 
          : (yt.videoChannelId || yt.discordChannelId);

        const discordChannel = await client.channels.fetch(targetChannelId).catch(() => null);
        if (!discordChannel) continue;

        // 2. LAYER 1 DE-DUPLICATION: Direct Channel History Scan
        // Check recent 30 messages in the channel to see if this video was ALREADY posted by the bot
        let alreadyInChannel = false;
        try {
          const recentMessages = await discordChannel.messages.fetch({ limit: 30 }).catch(() => null);
          if (recentMessages && recentMessages.size > 0) {
            alreadyInChannel = recentMessages.some(m => {
              const hasVideoLink = m.content && (m.content.includes(latest.videoId) || m.content.includes(latest.url));
              const hasEmbedLink = m.embeds && m.embeds.some(e => 
                (e.url && (e.url.includes(latest.videoId) || e.url.includes(latest.url))) ||
                (e.title && e.title.toLowerCase() === latest.title.toLowerCase()) ||
                (e.description && e.description.includes(latest.videoId))
              );
              return hasVideoLink || hasEmbedLink;
            });
          }
        } catch (scanErr) {
          console.warn('[YouTube Notifier] Channel history scan warning:', scanErr.message);
        }

        if (alreadyInChannel) {
          console.log(`[YouTube Notifier] Video "${latest.title}" (${latest.videoId}) was already sent in #${discordChannel.name}. Syncing database and skipping duplicate post.`);
          if (!postedList.includes(latest.videoId)) postedList.push(latest.videoId);
          if (postedList.length > 50) postedList.shift();
          db.updateGuild(guild.id, {
            youtube: { ...yt, lastVideoId: latest.videoId, postedVideoIds: postedList, channelId: effectiveChannelId }
          });
          continue;
        }

        // 3. LAYER 2 DE-DUPLICATION: Cold Start Baseline Seeding
        // If the bot has no recorded lastVideoId (e.g. first start or database reset),
        // do not blast an old video published hours/days ago!
        if (!yt.lastVideoId) {
          const publishedMs = new Date(latest.published).getTime();
          const ageHours = (Date.now() - publishedMs) / (1000 * 60 * 60);
          const isFresh = latest.isLive || (!isNaN(ageHours) && ageHours < 0.5);

          if (!isFresh) {
            console.log(`[YouTube Notifier] Cold start: established baseline for "${latest.title}" (${latest.videoId}, published ${Math.round(ageHours)}h ago). Skipping past upload alert.`);
            if (!postedList.includes(latest.videoId)) postedList.push(latest.videoId);
            db.updateGuild(guild.id, {
              youtube: { ...yt, lastVideoId: latest.videoId, postedVideoIds: postedList, channelId: effectiveChannelId }
            });
            continue;
          }
        }

        // 4. Update database IMMEDIATELY before sending to prevent race conditions
        if (!postedList.includes(latest.videoId)) postedList.push(latest.videoId);
        if (postedList.length > 50) postedList.shift();

        db.updateGuild(guild.id, {
          youtube: { ...yt, lastVideoId: latest.videoId, postedVideoIds: postedList, channelId: effectiveChannelId }
        });

        // 5. Send Announcement
        const pingText = yt.pingRole ? `<@&${yt.pingRole}>` : '@everyone';

        if (latest.isLive) {
          // Live Stream Announcement
          const msgTemplate = yt.customMessage || '🔴 **{channelName} IS LIVE NOW!**\n{url} 🎉';
          const formattedMessage = msgTemplate
            .replace(/{channelName}/g, latest.author)
            .replace(/{title}/g, latest.title)
            .replace(/{url}/g, latest.url);

          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔴 LIVE: ' + latest.title)
            .setURL(latest.url)
            .setAuthor({ 
              name: `${latest.author} (YouTube Live Stream)`, 
              iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', 
              url: latest.url 
            })
            .setImage(latest.thumbnail)
            .addFields(
              { name: '📺 Channel', value: latest.author, inline: true },
              { name: '🔴 Status', value: 'Streaming Live Now!', inline: true },
              { name: '🔗 Direct Link', value: `[Click Here to Join Stream](${latest.url})`, inline: false }
            )
            .setFooter({ text: 'YouTube Live Stream Notification • SAURAXT KA server' })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Join Live Stream 🔴')
              .setStyle(ButtonStyle.Link)
              .setURL(latest.url)
          );

          await discordChannel.send({
            content: `${pingText} ${formattedMessage}`,
            embeds: [embed],
            components: [row]
          }).catch(err => console.error('Failed to send YouTube live alert:', err));
          console.log(`[YouTube Notifier] Successfully announced Live Stream: ${latest.title}`);
        } else {
          // Regular Video Upload Announcement (NOT a live stream)
          const content = `${pingText} 🎬 **NEW VIDEO UPLOADED BY ${latest.author}!**\n${latest.url}`;

          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🎬 ' + latest.title)
            .setURL(latest.url)
            .setAuthor({ 
              name: `${latest.author} (New Video Upload)`, 
              iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', 
              url: latest.url 
            })
            .setImage(latest.thumbnail)
            .addFields(
              { name: '📺 Channel', value: latest.author, inline: true },
              { name: '🎬 Type', value: 'New Video Upload', inline: true },
              { name: '🔗 Watch Video', value: `[Click Here to Watch on YouTube](${latest.url})`, inline: false }
            )
            .setFooter({ text: 'YouTube Video Notification • SAURAXT KA server' })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Watch Video ▶️')
              .setStyle(ButtonStyle.Link)
              .setURL(latest.url)
          );

          await discordChannel.send({
            content,
            embeds: [embed],
            components: [row]
          }).catch(err => console.error('Failed to send YouTube video alert:', err));
          console.log(`[YouTube Notifier] Successfully announced Video Upload: ${latest.title}`);
        }
      }
    } catch (err) {
      console.error('Error in YouTube notifier loop:', err);
    } finally {
      isChecking = false;
    }
  };

  // Run initial check 5s after startup, then every 60s
  setTimeout(checkFeeds, 5000);
  setInterval(checkFeeds, 60000);
}