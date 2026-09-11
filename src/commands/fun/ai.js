import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { getAiChatReply } from '../../utils/aiChat.js';

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('Ask the built-in AI Assistant any question')
  .addStringOption(opt => opt.setName('prompt').setDescription('Your question or prompt').setRequired(true));

export async function execute(interaction) {
  const prompt = interaction.options.getString('prompt');
  await interaction.deferReply();

  try {
    const answer = await getAiChatReply(prompt, interaction.user.username);

    // If answer contains a GIF link, split text and GIF
    const gifMatch = answer.match(/https:\/\/tenor\.com\/\S+/);
    let cleanText = answer;
    let gifUrl = null;

    if (gifMatch) {
      gifUrl = gifMatch[0];
      cleanText = answer.replace(gifUrl, '').trim();
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🤖 SauraXT AI Assistant')
      .addFields(
        { name: '💬 Your Question', value: prompt.slice(0, 1024), inline: false },
        { name: '⚡ AI Response', value: (cleanText || 'GIF Reaction below!').slice(0, 1024), inline: false }
      )
      .setFooter({ text: 'SauraXT AI Companion • 24/7 Human-Like Intelligence' })
      .setTimestamp();

    if (gifUrl) {
      return interaction.editReply({ content: gifUrl, embeds: [embed] });
    }

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('AI Error:', err);
    return interaction.editReply({ content: 'AI assistant encountered a momentary glitch. Please try again!' });
  }
}
