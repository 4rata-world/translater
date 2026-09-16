import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { list } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-list')
  .setDescription('グローバルチャットに参加しているサーバー一覧を表示します');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channels = list();

  if (channels.length === 0) {
    return interaction.editReply('📭 まだどのチャンネルも参加していません。');
  }

  const embed = new EmbedBuilder()
    .setTitle('🌐 グローバルチャット 参加サーバー一覧')
    .setColor(0x5865f2)
    .setDescription(
      channels
        .map((c, i) => `**${i + 1}.** ${c.guildName} / #${c.channelName}`)
        .join('\n')
    )
    .setFooter({ text: `合計 ${channels.length} チャンネル` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
