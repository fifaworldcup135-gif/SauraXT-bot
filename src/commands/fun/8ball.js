import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

const responses = [
  'It is certain.', 'Without a doubt.', 'You may rely on it.', 'Yes definitely.',
  'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.',
  'Don\'t count on it.', 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'
];

export const data = new SlashCommandBuilder()
  .setName('8ball')
  .setDescription('Ask the magical 8-ball any question')
  .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true));

export async function execute(interaction) {
  const question = interaction.options.getString('question');
  const answer = responses[Math.floor(Math.random() * responses.length)];

  const embed = new EmbedBuilder()
    .setColor(config.colors.purple)
    .setTitle('?? Magic 8-Ball')
    .addFields(
      { name: '? Question', value: question, inline: false },
      { name: '?? Answer', value: `**${answer}**`, inline: false }
    )
    .setFooter({ text: `Asked by ${interaction.user.tag}` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
