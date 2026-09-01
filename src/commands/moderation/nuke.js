import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('nuke')
  .setDescription('Recreate this channel cleanly with same permissions to wipe all chat history')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  const channel = interaction.channel;
  const position = channel.position;
  const topic = channel.topic;

  try {
    const newChannel = await channel.clone({
      name: channel.name,
      reason: `Nuked by ${interaction.user.tag}`
    });

    await newChannel.setPosition(position);
    if (topic) await newChannel.setTopic(topic);
    await channel.delete('Channel Nuked');

    const nukeEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('?? Channel Nuked!')
      .setDescription(`This channel was cleanly nuked by ${interaction.user}.`)
      .setImage('https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif')
      .setTimestamp();

    await newChannel.send({ embeds: [nukeEmbed] });
  } catch (err) {
    console.error('Nuke error:', err);
    return interaction.reply({ content: '? Failed to nuke channel.', ephemeral: true });
  }
}
