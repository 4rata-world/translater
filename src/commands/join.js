import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { add, has } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-join')
  .setDescription('このチャンネルをグローバルチャットに参加させます')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption((opt) =>
    opt
      .setName('language')
      .setDescription('このチャンネルの言語')
      .setRequired(true)
      .addChoices(
        { name: '日本語', value: 'JA' },
        { name: 'English', value: 'EN-US' },
        { name: '한국어', value: 'KO' },
      )
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  const language = interaction.options.getString('language');

  if (has(channel.id)) {
    return interaction.editReply('⚠️ このチャンネルはすでにグローバルチャットに参加しています。');
  }

  let webhook;
  try {
    webhook = await channel.createWebhook({
      name: 'GlobalChat Bridge',
      reason: 'Global chat bot による自動作成',
    });
  } catch (err) {
    console.error(err);
    return interaction.editReply('❌ Webhookの作成に失敗しました。Botに `Manage Webhooks` 権限があるか確認してください。');
  }

  add(channel.id, {
    guildId: interaction.guildId,
    guildName: interaction.guild.name,
    channelName: channel.name,
    webhookId: webhook.id,
    webhookToken: webhook.token,
    language,
  });

  await interaction.editReply(
    `✅ **#${channel.name}** をグローバルチャットに登録しました！（言語: ${language}）`
  );
}
