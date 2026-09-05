import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../utils/musicManager.js';
import { getLyrics } from '../../utils/lyrics.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('lyrics')
  .setDescription('Search and display synced or plain song lyrics (LRCLIB Integration)')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('Song title and artist (defaults to currently playing track)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  let trackTitle = interaction.options.getString('query');
  let artistName = '';

  if (!trackTitle) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue.currentTrack) {
      return interaction.editReply({
        embeds: [errorEmbed('No Song Playing', 'Provide a song name to search: `/lyrics query: <Song Title>`')]
      });
    }
    trackTitle = queue.currentTrack.title;
    artistName = queue.currentTrack.artist || '';
  }

  const result = await getLyrics(trackTitle, artistName);

  if (!result || !result.lyrics) {
    return interaction.editReply({
      embeds: [errorEmbed('Lyrics Not Found', `Could not find lyrics for **${trackTitle}**.\n\nTry including both the song title and artist, e.g. \`/lyrics query: Adele Hello\`.`)]
    });
  }

  let lyricsText = result.lyrics;
  if (lyricsText.length > 4000) {
    lyricsText = lyricsText.substring(0, 3950) + '\n\n... *(lyrics truncated due to Discord length limit)*';
  }

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`🎤 Lyrics • ${result.title}`)
    .setAuthor({ name: result.artist ? `Artist: ${result.artist}` : 'Song Lyrics' })
    .setDescription(lyricsText)
    .setFooter({ text: `LRCLIB Synced Engine • ${result.synced ? 'Timestamped Synced' : 'Plain Text'}` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}
