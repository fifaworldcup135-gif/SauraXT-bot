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

export function startYouTubeNotifier(client) {
  console.log('🔴 YouTube Live Stream & Video Notifier worker started (checking every 60s)...');

  const checkFeeds = async () => {
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
              lastVideoId: yt?.lastVideoId || null
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
        if (!latest) continue;

        // If it's a new video/stream that hasn't been posted yet
        if (latest.videoId !== yt.lastVideoId) {
          // Select target channel: stream channel for live streams, video channel for uploads
          const targetChannelId = latest.isLive 
            ? (yt.streamChannelId || yt.discordChannelId) 
            : (yt.videoChannelId || yt.discordChannelId);

          const discordChannel = await client.channels.fetch(targetChannelId).catch(() => null);
          if (!discordChannel) continue;

          // Update database first so we don't double-post
          db.updateGuild(guild.id, {
            youtube: { ...yt, lastVideoId: latest.videoId, channelId: effectiveChannelId }
          });

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
          }
        }
      }
    } catch (err) {
      console.error('Error in YouTube notifier loop:', err);
    }
  };

  // Run initial check 5s after startup, then every 60s
  setTimeout(checkFeeds, 5000);
  setInterval(checkFeeds, 60000);
}