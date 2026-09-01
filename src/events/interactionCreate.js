import { handleComponentInteraction } from '../handlers/componentHandler.js';
import { errorEmbed } from '../utils/embeds.js';

export const once = false;

export async function execute(interaction, client) {
  try {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          embeds: [errorEmbed('Command Not Found', 'This command is no longer available.')],
          ephemeral: true
        });
      }

      await command.execute(interaction, client);
      return;
    }

    // 2. Handle Buttons & String Select Menus & Modals
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      await handleComponentInteraction(interaction, client);
      return;
    }
  } catch (err) {
    console.error(`Error handling interaction ${interaction.commandName || interaction.customId}:`, err);
    const replyPayload = {
      embeds: [errorEmbed('Command Execution Error', 'An error occurred while executing this command. Please try again.')],
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyPayload).catch(() => {});
    } else {
      await interaction.reply(replyPayload).catch(() => {});
    }
  }
}
