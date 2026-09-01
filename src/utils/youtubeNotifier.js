import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../database/db.js';
import { config } from '../config.js';

export async function fetchLatestYouTubeVideo(identifier) {
  try {
    let channelId = identifier;

    // If handle like @SAURAXT or channel name, resolve to channelId
    if (identifier.startsWith('@') || !identifier.startsWith('UC')) {
      const handleClean = identifier.replace('@', '');
      const pageRes = await fetch('https://www.youtube.com/@' + handleClean);
      const pageText = await pageRes.text();
      const match = pageText.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (match && match[1]) {
        channelId = match[1];
      }
    }

    const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
    const res = await fetch(feedUrl);
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
    const author = authorMatch ? authorMatch[1] : 'SAURAXT';
    const published = publishedMatch ? publishedMatch[1] : new Date().toISOString();

    return {
      channelId,
      videoId,
      title,
      author,
      published,
      url: 'https://www.youtube.com/watch?v=' + videoId,
      thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg'
    };
  } catch (err) {
    console.error('YouTube Fetch Error for ' + identifier + ':', err);
    return null;
  }
}

export function startYouTubeNotifier(client) {
  console.log('🔴 YouTube Live Stream & Video Notifier worker started (checking every 2m)...');

  setInterval(async () => {
    try {
      for (const [guildId, guildData] of Object.entries(db.data.guilds)) {
        const yt = guildData.youtube;
        if (!yt || !yt.channelId || !yt.discordChannelId) continue;

        const latest = await fetchLatestYouTubeVideo(yt.channelId);
        if (!latest) continue;

        // If it's a new video/stream that hasn't been posted yet
        if (latest.videoId !== yt.lastVideoId) {
          const discordChannel = await client.channels.fetch(yt.discordChannelId).catch(() => null);
          if (!discordChannel) continue;

          // Update database first so we don't double-post
          db.updateGuild(guildId, {
            youtube: { ...yt, lastVideoId: latest.videoId }
          });

          const pingText = yt.pingRole ? '<@&' + yt.pingRole + '>' : '@everyone';
          const msgTemplate = yt.customMessage || '🔴 **{channelName} IS LIVE NOW!**\\n{url}';
          const formattedMessage = msgTemplate
            .replace(/{channelName}/g, latest.author)
            .replace(/{title}/g, latest.title)
            .replace(/{url}/g, latest.url);

          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔴 ' + latest.title)
            .setURL(latest.url)
            .setAuthor({ name: latest.author + ' (YouTube Live / Upload)', iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', url: latest.url })
            .setImage(latest.thumbnail)
            .addFields(
              { name: '📺 Channel', value: latest.author, inline: true },
              { name: '🔗 Direct Link', value: '[Click Here to Watch Stream](' + latest.url + ')', inline: true }
            )
            .setFooter({ text: 'YouTube Live Stream Notification • SAURAXT KA server' })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Watch Live Stream')
              .setStyle(ButtonStyle.Link)
              .setURL(latest.url)
              .setEmoji('▶️')
          );

          await discordChannel.send({
            content: pingText + ' ' + formattedMessage,
            embeds: [embed],
            components: [row]
          }).catch(err => console.error('Failed to send YouTube alert:', err));
        }
      }
    } catch (err) {
      console.error('Error in YouTube notifier loop:', err);
    }
  }, 120000); // Check every 2 minutes
}