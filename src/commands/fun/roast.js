import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

const roasts = [
  'I\'d agree with you, but then we\'d both be wrong.',
  'You bring everyone so much joy... when you leave the room.',
  'I\'m not insulting you, I\'m describing you.',
  'If laughter is the best medicine, your face must be curing the world.',
  'You have an entire life to be an idiot. Why not take today off?',
  'Somewhere out there, a tree is working hard to produce oxygen for you. You owe it an apology.',
  'I thought of you today. It reminded me to take out the trash.',
  'Light travels faster than sound, which is why you seemed bright until you spoke.'
];

export const data = new SlashCommandBuilder()
  .setName('roast')
  .setDescription('Savage roast a member for fun')
  .addUserOption(opt => opt.setName('target').setDescription('The member to roast').setRequired(true));

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const roast = roasts[Math.floor(Math.random() * roasts.length)];

  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('?? Savage Roast!')
    .setDescription(`${target}, ${roast}`)
    .setFooter({ text: `Roast delivered on behalf of ${interaction.user.tag}` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
