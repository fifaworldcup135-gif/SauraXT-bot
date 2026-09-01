import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { config } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('tictactoe')
  .setDescription('Play a 2-player game of Tic-Tac-Toe on Discord buttons')
  .addUserOption(opt => opt.setName('opponent').setDescription('Player 2').setRequired(true));

export async function execute(interaction) {
  const opponent = interaction.options.getUser('opponent');
  if (opponent.id === interaction.user.id || opponent.bot) {
    return interaction.reply({ content: '? You must challenge another human player!', ephemeral: true });
  }

  const board = Array(9).fill(null);
  let currentTurn = interaction.user.id; // interaction.user = X (id1), opponent = O (id2)

  const makeRows = (disabled = false) => {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const val = board[idx];
        const btn = new ButtonBuilder()
          .setCustomId(`ttt_${idx}`)
          .setLabel(val || '?')
          .setStyle(val === 'X' ? ButtonStyle.Danger : val === 'O' ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(disabled || val !== null);
        row.addComponents(btn);
      }
      rows.push(row);
    }
    return rows;
  };

  const checkWinner = () => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every(cell => cell !== null)) return 'tie';
    return null;
  };

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('? Tic-Tac-Toe Match ?')
    .setDescription(`**Player 1 (?):** ${interaction.user}\n**Player 2 (?):** ${opponent}\n\n?? **Current Turn:** <@${currentTurn}>`)
    .setTimestamp();

  const response = await interaction.reply({
    content: `${opponent}, you were challenged by ${interaction.user}!`,
    embeds: [embed],
    components: makeRows(false)
  });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
    filter: i => [interaction.user.id, opponent.id].includes(i.user.id)
  });

  collector.on('collect', async i => {
    if (i.user.id !== currentTurn) {
      return i.reply({ content: '? It is not your turn yet!', ephemeral: true });
    }

    const idx = parseInt(i.customId.replace('ttt_', ''), 10);
    const symbol = currentTurn === interaction.user.id ? 'X' : 'O';
    board[idx] = symbol;

    const winResult = checkWinner();
    if (winResult) {
      collector.stop('finished');
      let endDesc = '';
      if (winResult === 'tie') {
        endDesc = '?? **The game is a TIE!** Well played by both players!';
      } else {
        const winnerId = winResult === 'X' ? interaction.user.id : opponent.id;
        endDesc = `?? **<@${winnerId}> (${winResult}) WINS THE MATCH!** ??`;
      }

      const finishEmbed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('?? Tic-Tac-Toe Game Over')
        .setDescription(endDesc)
        .setTimestamp();

      return i.update({ embeds: [finishEmbed], components: makeRows(true) });
    }

    // Swap turn
    currentTurn = currentTurn === interaction.user.id ? opponent.id : interaction.user.id;

    const updateEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('? Tic-Tac-Toe Match ?')
      .setDescription(`**Player 1 (?):** ${interaction.user}\n**Player 2 (?):** ${opponent}\n\n?? **Current Turn:** <@${currentTurn}>`)
      .setTimestamp();

    return i.update({ embeds: [updateEmbed], components: makeRows(false) });
  });

  collector.on('end', async (c, reason) => {
    if (reason === 'time') {
      await interaction.editReply({ content: '? Game timed out due to inactivity.', components: makeRows(true) }).catch(() => {});
    }
  });
}
