import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { config } from '../../config.js';

const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '?? Rock', paper: '?? Paper', scissors: '?? Scissors' };

export const data = new SlashCommandBuilder()
  .setName('rps')
  .setDescription('Play Rock, Paper, Scissors with interactive buttons');

export async function execute(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rps_rock').setLabel('Rock').setEmoji('??').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('rps_paper').setLabel('Paper').setEmoji('??').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('rps_scissors').setLabel('Scissors').setEmoji('??').setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('?? Rock, Paper, Scissors')
    .setDescription('Choose your move by clicking one of the buttons below within 30 seconds!')
    .setFooter({ text: 'Can you defeat the bot?' });

  const response = await interaction.reply({ embeds: [embed], components: [row] });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    filter: i => i.user.id === interaction.user.id
  });

  collector.on('collect', async i => {
    const userChoice = i.customId.replace('rps_', '');
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    collector.stop('played');

    let result = '';
    let color = config.colors.primary;

    if (userChoice === botChoice) {
      result = '?? **It is a TIE!** We made the same choice!';
      color = config.colors.warning;
    } else if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'paper' && botChoice === 'rock') ||
      (userChoice === 'scissors' && botChoice === 'paper')
    ) {
      result = '?? **YOU WON!** Congratulations!';
      color = config.colors.success;
    } else {
      result = '?? **BOT WINS!** Better luck next time!';
      color = config.colors.error;
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle('?? RPS Match Results')
      .setDescription(`${result}\n\n**Your Choice:** ${emojis[userChoice]}\n**Bot Choice:** ${emojis[botChoice]}`)
      .setTimestamp();

    return i.update({ embeds: [resultEmbed], components: [] });
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      await interaction.editReply({ content: '? Match timed out.', components: [] }).catch(() => {});
    }
  });
}
