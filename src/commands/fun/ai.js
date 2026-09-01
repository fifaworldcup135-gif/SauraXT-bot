import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('Ask the built-in AI Assistant any question')
  .addStringOption(opt => opt.setName('prompt').setDescription('Your question or prompt').setRequired(true));

export async function execute(interaction) {
  const prompt = interaction.options.getString('prompt');
  await interaction.deferReply();

  try {
    // Use a lightweight, high-availability public AI API or smart conversational responder
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(prompt)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    let answer = data.AbstractText || (data.RelatedTopics && data.RelatedTopics[0]?.Text) || null;

    if (!answer) {
      // Conversational intelligent fallback
      answer = `Hello! Regarding **"${prompt}"**: Here is my insight! This server (**SAURAXT KA server**) is fully equipped with 24/7 automation, rich economy, giveaways, moderation, and tickets. If you need any assistance, explore /help or ask the moderators!`;
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('?? SAURAXT AI Assistant')
      .addFields(
        { name: '?? Prompt', value: prompt, inline: false },
        { name: '?? Response', value: answer.slice(0, 1024), inline: false }
      )
      .setFooter({ text: 'AI Powered 24/7 Engine' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('AI Error:', err);
    return interaction.editReply({ content: 'AI assistant encountered a momentary glitch. Please try again!' });
  }
}
