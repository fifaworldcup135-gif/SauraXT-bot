import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Bulk delete up to 100 messages from the channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
  .addUserOption(opt => opt.setName('filter_user').setDescription('Only delete messages from this specific user').setRequired(false));

export async function execute(interaction) {
  const amount = interaction.options.getInteger('amount');
  const filterUser = interaction.options.getUser('filter_user');

  await interaction.deferReply({ ephemeral: true });

  try {
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    let toDelete = messages;

    if (filterUser) {
      toDelete = messages.filter(m => m.author.id === filterUser.id);
    }

    const deleted = await interaction.channel.bulkDelete(toDelete, true);

    return interaction.editReply({
      embeds: [successEmbed('Purge Completed', `Successfully deleted **${deleted.size}** message(s)${filterUser ? ` from ${filterUser}` : ''}.`)]
    });
  } catch (err) {
    console.error('Purge error:', err);
    return interaction.editReply({
      embeds: [errorEmbed('Purge Failed', 'Cannot delete messages older than 14 days due to Discord restrictions.')]
    });
  }
}
