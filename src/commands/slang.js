import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as deepl from 'deepl-node';
import { base, setEntry, removeEntry, listEntries, rebuild } from '../glossary.js';

const LANGS = [
  { name: '日本語', value: 'JA' },
  { name: '英語', value: 'EN-US' },
  { name: '韓国語', value: 'KO' },
  { name: '中国語', value: 'ZH' },
  { name: 'スペイン語', value: 'ES' },
  { name: 'フランス語', value: 'FR' },
  { name: 'ドイツ語', value: 'DE' },
  { name: 'ポルトガル語', value: 'PT-BR' },
  { name: 'ロシア語', value: 'RU' },
  { name: 'イタリア語', value: 'IT' },
];

export const data = new SlashCommandBuilder()
  .setName('global-slang')
  .setDescription('スラング辞書（決まった訳し方）を管理します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('言葉と訳を登録する')
      .addStringOption((o) => o.setName('from').setDescription('元の言語').setRequired(true).addChoices(...LANGS))
      .addStringOption((o) => o.setName('word').setDescription('元の言葉').setRequired(true))
      .addStringOption((o) => o.setName('to').setDescription('訳す先の言語').setRequired(true).addChoices(...LANGS))
      .addStringOption((o) => o.setName('translation').setDescription('こう訳してほしい言葉').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('登録した言葉を消す')
      .addStringOption((o) => o.setName('from').setDescription('元の言語').setRequired(true).addChoices(...LANGS))
      .addStringOption((o) => o.setName('word').setDescription('消す言葉').setRequired(true))
      .addStringOption((o) => o.setName('to').setDescription('訳す先の言語').setRequired(true).addChoices(...LANGS))
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('登録した言葉の一覧'));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    const groups = listEntries(guildId);
    if (groups.length === 0) return interaction.editReply('📭 まだ何も登録されていません。');
    const text = groups
      .map(({ pair, entries }) =>
        `**${pair}**\n` + Object.entries(entries).map(([w, t]) => `・${w} → ${t}`).join('\n')
      )
      .join('\n\n');
    return interaction.editReply(text.slice(0, 1900));
  }

  const from = interaction.options.getString('from');
  const to = interaction.options.getString('to');
  const word = interaction.options.getString('word').trim();

  if (base(from) === base(to)) {
    return interaction.editReply('⚠️ 元の言語と訳す先の言語が同じです。');
  }

  const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

  try {
    if (sub === 'add') {
      const translation = interaction.options.getString('translation').trim();
      if (/[\t\r\n]/.test(word + translation)) {
        return interaction.editReply('⚠️ 改行やタブは使えません。');
      }
      setEntry(guildId, from, to, word, translation);
      await rebuild(translator, guildId, from, to);
      return interaction.editReply(`✅ 登録しました：「${word}」→「${translation}」（${base(from).toUpperCase()}→${base(to).toUpperCase()}）`);
    }

    if (sub === 'remove') {
      if (!removeEntry(guildId, from, to, word)) {
        return interaction.editReply('⚠️ その言葉は登録されていません。');
      }
      await rebuild(translator, guildId, from, to);
      return interaction.editReply(`🗑️ 「${word}」を消しました。`);
    }
  } catch (err) {
    console.error(err);
    return interaction.editReply(`❌ 辞書の更新に失敗しました：${err.message}`);
  }
}
