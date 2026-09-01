import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { config } from '../../config.js';

const triviaQuestions = [
  { q: 'What is the highest-grossing film of all time?', options: ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars: The Force Awakens'], answer: 0 },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1 },
  { q: 'How many bones are there in an adult human body?', options: ['180', '206', '215', '195'], answer: 1 },
  { q: 'What is the chemical symbol for Gold?', options: ['Ag', 'Fe', 'Au', 'Pb'], answer: 2 },
  { q: 'In which year did the Titanic sink?', options: ['1905', '1912', '1920', '1898'], answer: 1 },
  { q: 'What is the capital city of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], answer: 2 },
  { q: 'Who painted the Mona Lisa?', options: ['Vincent van Gogh', 'Leonardo da Vinci', 'Pablo Picasso', 'Claude Monet'], answer: 1 }
];

export const data = new SlashCommandBuilder()
  .setName('trivia')
  .setDescription('Test your knowledge with an interactive trivia question');

export async function execute(interaction) {
  const trivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

  const row = new ActionRowBuilder();
  trivia.options.forEach((opt, idx) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`trivia_${idx}`)
        .setLabel(opt)
        .setStyle(ButtonStyle.Primary)
    );
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('?? Trivia Time!')
    .setDescription(`**${trivia.q}**\n\nClick the correct button within 20 seconds!`)
    .setFooter({ text: 'SAURAXT Mini Games' })
    .setTimestamp();

  const response = await interaction.reply({ embeds: [embed], components: [row] });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000,
    filter: i => i.user.id === interaction.user.id
  });

  collector.on('collect', async i => {
    const chosenIdx = parseInt(i.customId.replace('trivia_', ''), 10);
    collector.stop('answered');

    if (chosenIdx === trivia.answer) {
      return i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('?? Correct Answer!')
            .setDescription(`Great job! **${trivia.options[trivia.answer]}** was indeed the correct answer.`)
        ],
        components: []
      });
    } else {
      return i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('? Incorrect Answer')
            .setDescription(`Oops! You selected **${trivia.options[chosenIdx]}**.\nThe correct answer was **${trivia.options[trivia.answer]}**.`)
        ],
        components: []
      });
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('? Time Up!')
            .setDescription(`Time expired! The correct answer was **${trivia.options[trivia.answer]}**.`)
        ],
        components: []
      }).catch(() => {});
    }
  });
}
