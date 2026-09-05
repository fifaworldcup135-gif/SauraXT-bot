import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View most played songs and music stats')
  .addSubcommand(sub =>
    sub.setName('top')
      .setDescription('Show top 10 most played tracks in this server')
  );

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const guildSettings = db.getGuild(guildId);
  const stats = guildSettings.musicStats || {};
  const totalPlays = stats.totalPlays || {};

  const sorted = Object.values(totalPlays).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 10);

  if (sorted.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('No Stats', 'No songs have been tracked in this server yet!')],
      ephemeral: true
    });
  }

  const description = sorted.map((song, i) => `**${i + 1}.** ${song.title} - \`${song.count || 1} plays\``).join('\n');
  const embed = new EmbedBuilder()
    .setTitle('Top 10 Songs - This Server')
    .setDescription(description)
    .setColor('#6A5ACD')
    .setFooter({
      text: 'Lunar',
      iconURL: interaction.client.user?.displayAvatarURL() || undefined
    });

  return interaction.reply({ embeds: [embed] });
}
