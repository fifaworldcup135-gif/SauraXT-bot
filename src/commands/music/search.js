import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import play from 'play-dl';
import { musicManager } from '../../utils/musicManager.js';
import { errorEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search for music and pick from the top results')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('The song or artist to search for')
      .setRequired(true)
  );

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel) {
    return interaction.reply({
      embeds: [errorEmbed('Voice Channel Required', 'You must join a Voice Channel before searching music!')],
      ephemeral: true
    });
  }

  await interaction.deferReply();
  const query = interaction.options.getString('query');
  const botName = interaction.client.user?.username || 'SauraXT';
  const botAvatar = interaction.client.user?.displayAvatarURL() || undefined;

  try {
    await musicManager.ensureSoundCloud();
    const results = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 5 }).catch(() => []);

    if (!results || results.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed('No Results Found', `Could not find any songs matching \`${query}\`. Try another query!`)]
      });
    }

    const options = results.slice(0, 5).map((track, i) => {
      const title = (track.name || track.title || 'Track').substring(0, 75);
      const artist = (track.user?.name || 'Artist').substring(0, 40);
      const durSec = track.durationInSec || 180;
      const duration = `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}`;
      return {
        label: `${i + 1}. ${title}`,
        description: `${artist} • ${duration}`,
        value: track.url
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`search_select_${interaction.user.id}`)
      .setPlaceholder('Choose a song to play from the list...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const desc = results.slice(0, 5).map((t, i) => {
      const title = t.name || t.title;
      const durSec = t.durationInSec || 180;
      const dur = `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}`;
      return `**${i + 1}.** [${title}](${t.url}) — \`${dur}\``;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#6A5ACD')
      .setTitle(`🔍 Search Results: ${query}`)
      .setDescription(`${desc}\n\n*Select a song below to start playing.*`)
      .setFooter({ text: `${botName} • Search Engine`, iconURL: botAvatar });

    const replyMsg = await interaction.editReply({ embeds: [embed], components: [row] });

    const filter = i => i.customId === `search_select_${interaction.user.id}` && i.user.id === interaction.user.id;
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async selectInteraction => {
      const selectedUrl = selectInteraction.values[0];
      await selectInteraction.deferUpdate();

      const guildSettings = db.getGuild(interaction.guildId);
      const playRes = await musicManager.resolveAndPlay(voiceChannel, interaction.channel, selectedUrl, interaction.member, guildSettings);

      if (playRes.status === 'playing') {
        const npEmbed = await musicManager.createNowPlayingEmbed(playRes.track, playRes.queue);
        await selectInteraction.editReply({ embeds: [npEmbed], components: [] });
      } else {
        const queuedEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Added to Queue')
          .setDescription(`**[${playRes.track.title}](${playRes.track.url})**`)
          .addFields(
            { name: 'Duration', value: `\`${playRes.track.duration || 'HQ'}\``, inline: true },
            { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setFooter({ text: botName, iconURL: botAvatar });
        if (playRes.track.thumbnail) queuedEmbed.setThumbnail(playRes.track.thumbnail);
        await selectInteraction.editReply({ embeds: [queuedEmbed], components: [] });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  } catch (err) {
    console.error('Search command error:', err);
    return interaction.editReply({
      embeds: [errorEmbed('Search Failed', 'An error occurred while searching for tracks.')]
    });
  }
}
