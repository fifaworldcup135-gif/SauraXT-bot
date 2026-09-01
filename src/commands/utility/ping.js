import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot websocket latency and response speed');

export async function execute(interaction, client) {
  const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsPing = client.ws.ping;

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('🏓 Pong!')
    .addFields(
      { name: '⚡ Roundtrip Latency', value: '`' + roundtrip + ' ms`', inline: true },
      { name: '🌐 Discord Gateway WS', value: '`' + wsPing + ' ms`', inline: true },
      { name: '🟢 24/7 Cloud Host', value: '`ONLINE`', inline: true }
    )
    .setFooter({ text: 'SAURAXT KA server' })
    .setTimestamp();

  return interaction.editReply({ content: '', embeds: [embed] });
}
