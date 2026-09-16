import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { add, has } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-join')
  .setDescription('このチャンネルをグローバルチャットに参加させます')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;

  if (has(channel.id)) {
    return interaction.editReply('⚠️ このチャンネルはすでにグローバルチャットに参加しています。');
  }

  // Webhook の作成
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
  });

  await interaction.editReply(
    `✅ **#${channel.name}** をグローバルチャットに登録しました！\nこのチャンネルに送ったメッセージが他のサーバーに届くようになります。`
  );
}
