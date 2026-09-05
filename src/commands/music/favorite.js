import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';
import play from 'play-dl';

export const data = new SlashCommandBuilder()
  .setName('favorite')
  .setDescription('Manage your personal favorite music tracks (Groove + Lunar feature)')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a song to your favorites (defaults to currently playing song)')
      .addStringOption(opt => opt.setName('query').setDescription('Song name or URL to add (optional)'))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('View your list of saved favorite tracks')
  )
  .addSubcommand(sub =>
    sub.setName('play')
      .setDescription('Play your favorites into your current voice channel')
      .addIntegerOption(opt => opt.setName('number').setDescription('Specific track number from your list to play (optional)').setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a song from your favorites list')
      .addIntegerOption(opt => opt.setName('number').setDescription('Track number from /favorite list to remove').setRequired(true).setMinValue(1))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildSettings = db.getGuild(interaction.guildId);

  // --- SUBCOMMAND: ADD ---
  if (sub === 'add') {
    await interaction.deferReply();
    const query = interaction.options.getString('query');
    let trackToAdd = null;

    if (query) {
      try {
        const results = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } });
        if (results && results.length > 0) {
          const item = results[0];
          trackToAdd = {
            title: item.name || item.title || query,
            url: item.url,
            duration: item.durationInSec ? `${Math.floor(item.durationInSec / 60)}:${item.durationInSec % 60 < 10 ? '0' : ''}${item.durationInSec % 60}` : 'Unknown',
            artist: item.user?.name || item.publisher?.artist || 'SoundCloud Artist',
            thumbnail: item.thumbnail || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'
          };
        } else {
          const ytResults = await play.search(query, { limit: 1 });
          if (ytResults && ytResults.length > 0) {
            const item = ytResults[0];
            trackToAdd = {
              title: item.title || query,
              url: item.url,
              duration: item.durationRaw || 'Unknown',
              artist: item.channel?.name || 'YouTube Creator',
              thumbnail: item.thumbnails?.[0]?.url || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'
            };
          }
        }
      } catch (err) {
        console.error('Favorite add search error:', err);
      }
    } else {
      const queue = musicManager.getQueue(interaction.guildId);
      if (queue.currentTrack) {
        trackToAdd = queue.currentTrack;
      }
    }

    if (!trackToAdd) {
      return interaction.editReply({
        embeds: [errorEmbed('No Track Specified', 'No song is currently playing! Provide a search query: `/favorite add query: <song name>`')]
      });
    }

    const added = db.addFavorite(interaction.guildId, interaction.user.id, trackToAdd);
    if (added) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⭐ Added to Favorites!')
        .setDescription(`**[${trackToAdd.title}](${trackToAdd.url})** has been saved to your personal library.`)
        .setThumbnail(trackToAdd.thumbnail)
        .addFields(
          { name: '👤 Artist', value: trackToAdd.artist || 'Unknown', inline: true },
          { name: '⏱️ Duration', value: trackToAdd.duration || 'HQ', inline: true }
        )
        .setFooter({ text: 'Access anytime with /favorite list or /favorite play' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } else {
      return interaction.editReply({
        embeds: [infoEmbed('Already in Favorites', `**[${trackToAdd.title}](${trackToAdd.url})** is already saved in your favorites list.`)]
      });
    }
  }

  // --- SUBCOMMAND: LIST ---
  if (sub === 'list') {
    const favorites = db.getFavorites(interaction.guildId, interaction.user.id);
    if (!favorites || favorites.length === 0) {
      return interaction.reply({
        embeds: [infoEmbed('No Favorites Saved', 'Your favorites list is currently empty!\n\nUse `/favorite add` while listening to any song or click the ⭐ button on the playback controller to save songs.')],
        ephemeral: true
      });
    }

    const formattedList = favorites.slice(0, 15).map((track, i) => 
      `**${i + 1}.** [${track.title}](${track.url}) \`[${track.duration || 'HQ'}]\` — *${track.artist || 'Artist'}*`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`⭐ Your Favorite Tracks (${favorites.length})`)
      .setDescription(formattedList)
      .setFooter({ text: 'Play all with /favorite play or a specific track with /favorite play <number>' })
      .setTimestamp();

    if (favorites.length > 15) {
      embed.setDescription(formattedList + `\n\n*...and ${favorites.length - 15} more tracks.*`);
    }

    return interaction.reply({ embeds: [embed] });
  }

  // --- SUBCOMMAND: PLAY ---
  if (sub === 'play') {
    const voiceChannel = interaction.member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [errorEmbed('Voice Channel Required', 'You must join a Voice Channel to play your favorites!')],
        ephemeral: true
      });
    }

    const favorites = db.getFavorites(interaction.guildId, interaction.user.id);
    if (!favorites || favorites.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed('No Favorites Found', 'Your favorites list is empty. Add songs first with `/favorite add`!')],
        ephemeral: true
      });
    }

    const trackNumber = interaction.options.getInteger('number');

    if (trackNumber) {
      const index = trackNumber - 1;
      if (index < 0 || index >= favorites.length) {
        return interaction.reply({
          embeds: [errorEmbed('Invalid Number', `Please choose a track number between 1 and ${favorites.length}. Check \`/favorite list\`.`)],
          ephemeral: true
        });
      }

      await interaction.deferReply();
      const targetTrack = favorites[index];
      try {
        const result = await musicManager.resolveAndPlay(voiceChannel, interaction.channel, targetTrack.url, interaction.member, guildSettings);
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(result.status === 'queued' ? `⭐ Added Favorite to Queue (#${result.position})` : '⭐ Playing Favorite Track')
          .setDescription(`**[${targetTrack.title}](${targetTrack.url})** in **${voiceChannel.name}**`)
          .setThumbnail(targetTrack.thumbnail)
          .setFooter({ text: `Requested by ${interaction.user.tag}` });
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed('Playback Error', err.message.replace(/^(VIP_RESTRICTED|MISSING_PERMS|NO_RESULTS): /, ''))]
        });
      }
    } else {
      // Play all favorites
      await interaction.deferReply();
      let enqueuedCount = 0;
      for (const track of favorites) {
        try {
          await musicManager.resolveAndPlay(voiceChannel, interaction.channel, track.url, interaction.member, guildSettings);
          enqueuedCount++;
        } catch (err) {
          console.error('Batch favorite play error:', err.message);
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⭐ Favorites Loaded')
        .setDescription(`Successfully enqueued **${enqueuedCount}** tracks from your Favorites into **${voiceChannel.name}**!`)
        .setFooter({ text: 'Use /queue to see the full list' });

      return interaction.editReply({ embeds: [embed] });
    }
  }

  // --- SUBCOMMAND: REMOVE ---
  if (sub === 'remove') {
    const trackNumber = interaction.options.getInteger('number');
    const index = trackNumber - 1;
    const removed = db.removeFavorite(interaction.guildId, interaction.user.id, index);

    if (!removed) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Track Number', 'No song found at that position in your favorites. Check `/favorite list`.')],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [successEmbed('Favorite Removed ⭐', `Removed **[${removed.title}](${removed.url})** from your favorites list.`)]
    });
  }
}
