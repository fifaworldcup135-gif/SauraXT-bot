import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create an interactive community poll')
  .addStringOption(opt => opt.setName('question').setDescription('The poll question').setRequired(true))
  .addStringOption(opt => opt.setName('option1').setDescription('First option').setRequired(true))
  .addStringOption(opt => opt.setName('option2').setDescription('Second option').setRequired(true))
  .addStringOption(opt => opt.setName('option3').setDescription('Third option').setRequired(false))
  .addStringOption(opt => opt.setName('option4').setDescription('Fourth option').setRequired(false));

const emojis = ['1??', '2??', '3??', '4??'];

export async function execute(interaction) {
  const question = interaction.options.getString('question');
  const rawOptions = [
    interaction.options.getString('option1'),
    interaction.options.getString('option2'),
    interaction.options.getString('option3'),
    interaction.options.getString('option4')
  ].filter(Boolean);

  const desc = rawOptions.map((opt, i) => `${emojis[i]} **${opt}**`).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`?? Community Poll: ${question}`)
    .setDescription(desc)
    .setFooter({ text: `Poll started by ${interaction.user.tag}` })
    .setTimestamp();

  const pollMsg = await interaction.channel.send({ embeds: [embed] });
  for (let i = 0; i < rawOptions.length; i++) {
    await pollMsg.react(emojis[i]).catch(() => {});
  }

  return interaction.reply({ content: '? Poll created and posted!', ephemeral: true });
}
