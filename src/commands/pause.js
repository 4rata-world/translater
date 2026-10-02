import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { get, add, has, list } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-pause')
  .setDescription('転送を一時停止・再開します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption((o) =>
    o
      .setName('action')
      .setDescription('止める／再開')
      .setRequired(true)
      .addChoices({ name: '止める', value: 'pause' }, { name: '再開', value: 'resume' })
  )
  .addStringOption((o) =>
    o
      .setName('scope')
      .setDescription('範囲（省略するとこのチャンネルだけ）')
      .addChoices(
        { name: 'このチャンネルだけ', value: 'channel' },
        { name: 'サーバー全体', value: 'server' }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const paused = interaction.options.getString('action') === 'pause';
  const scope = interaction.options.getString('scope') ?? 'channel';

  let ids;
  if (scope === 'server') {
    ids = list(interaction.guildId).map((c) => c.channelId);
  } else {
    if (!has(interaction.channelId)) {
      return interaction.editReply('⚠️ このチャンネルはまだ参加していません。');
    }
    ids = [interaction.channelId];
  }

  if (ids.length === 0) {
    return interaction.editReply('📭 つながっているチャンネルがありません。');
  }

  for (const id of ids) {
    add(id, { ...get(id), paused });
  }

  await interaction.editReply(
    paused
      ? `⏸ ${ids.length} チャンネルの転送を止めました。再開するには \`/global-pause\` で「再開」を選んでください。`
      : `▶️ ${ids.length} チャンネルの転送を再開しました。`
  );
}
