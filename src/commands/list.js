import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { list } from '../registry.js';

const LANG_NAMES = {
  JA: '日本語', 'EN-US': '英語', KO: '韓国語', ZH: '中国語',
  ES: 'スペイン語', FR: 'フランス語', DE: 'ドイツ語', 'PT-BR': 'ポルトガル語',
  RU: 'ロシア語', IT: 'イタリア語', ID: 'インドネシア語', TR: 'トルコ語', AR: 'アラビア語',
};

export const data = new SlashCommandBuilder()
  .setName('global-list')
  .setDescription('このサーバーでつながっているチャンネルを表示します');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channels = list(interaction.guildId);

  if (channels.length === 0) {
    return interaction.editReply('📭 まだどのチャンネルも参加していません。');
  }

  const embed = new EmbedBuilder()
    .setTitle('🌐 つながっているチャンネル')
    .setColor(0x5865f2)
    .setDescription(
      channels
        .map((c, i) => `**${i + 1}.** <#${c.channelId}>（${LANG_NAMES[c.language] ?? '未設定'}）`)
        .join('\n')
    )
    .setFooter({ text: `合計 ${channels.length} チャンネル` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
