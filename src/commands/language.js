import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { get, add, has } from '../registry.js';

const NAMES = {
  JA: '日本語', 'EN-US': '英語', KO: '韓国語', ZH: '中国語',
  ES: 'スペイン語', FR: 'フランス語', DE: 'ドイツ語', 'PT-BR': 'ポルトガル語',
  RU: 'ロシア語', IT: 'イタリア語', ID: 'インドネシア語', TR: 'トルコ語', AR: 'アラビア語',
};

export const data = new SlashCommandBuilder()
  .setName('global-language')
  .setDescription('このチャンネルの言語を変更します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption((opt) =>
    opt
      .setName('language')
      .setDescription('新しい言語')
      .setRequired(true)
      .addChoices(
        { name: '日本語', value: 'JA' },
        { name: 'English', value: 'EN-US' },
        { name: '한국어', value: 'KO' },
        { name: '中文（简体）', value: 'ZH' },
        { name: 'Español', value: 'ES' },
        { name: 'Français', value: 'FR' },
        { name: 'Deutsch', value: 'DE' },
        { name: 'Português', value: 'PT-BR' },
        { name: 'Русский', value: 'RU' },
        { name: 'Italiano', value: 'IT' },
        { name: 'Bahasa Indonesia', value: 'ID' },
        { name: 'Türkçe', value: 'TR' },
        { name: 'العربية', value: 'AR' },
      )
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  if (!has(channel.id)) {
    return interaction.editReply('⚠️ このチャンネルはまだ参加していません。先に `/global-join` を実行してください。');
  }

  const language = interaction.options.getString('language');
  add(channel.id, { ...get(channel.id), language });

  await interaction.editReply(`✅ このチャンネルの言語を **${NAMES[language]}** に変更しました。`);
}
