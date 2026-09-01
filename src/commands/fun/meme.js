import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('meme')
  .setDescription('Get a fresh random meme from Reddit');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const res = await fetch('https://meme-api.com/gimme');
    const data = await res.json();

    if (!data.url || data.nsfw) {
      return interaction.editReply({ content: 'Could not fetch a suitable safe meme. Please try again!' });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(data.title.slice(0, 256))
      .setURL(data.postLink)
      .setImage(data.url)
      .setFooter({ text: `?? ${data.ups} upvotes ? r/${data.subreddit}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Meme error:', err);
    return interaction.editReply({ content: 'Failed to fetch meme at this time.' });
  }
}
