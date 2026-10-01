import { SlashCommandBuilder } from 'discord.js';
import * as deepl from 'deepl-node';

export const data = new SlashCommandBuilder()
  .setName('global-stats')
  .setDescription('DeepLの今月の使用量を表示します（Botの持ち主のみ）');

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  // Botの持ち主だけが使える（使用量は全サーバー合計のため）
  const app = await client.application.fetch();
  const ownerId = app.owner?.ownerId ?? app.owner?.id;
  if (interaction.user.id !== ownerId) {
    return interaction.editReply('⚠️ このコマンドはBotの持ち主だけが使えます。');
  }

  const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
  const usage = await translator.getUsage();

  if (!usage.character) {
    return interaction.editReply('使用量を取得できませんでした。');
  }

  const { count, limit } = usage.character;
  const pct = Math.round((count / limit) * 100);
  const lines = [
    '📊 **DeepL 今月の使用量**',
    `${count.toLocaleString('ja-JP')} / ${limit.toLocaleString('ja-JP')} 文字（${pct}%）`,
    `残り ${(limit - count).toLocaleString('ja-JP')} 文字`,
  ];
  if (usage.anyLimitReached()) lines.push('⚠️ 上限に達しています。来月までは原文のまま転送されます。');

  await interaction.editReply(lines.join('\n'));
}
