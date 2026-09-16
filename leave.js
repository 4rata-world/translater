import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { remove, get, has } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-leave')
  .setDescription('このチャンネルをグローバルチャットから退出させます')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;

  if (!has(channel.id)) {
    return interaction.editReply('⚠️ このチャンネルはグローバルチャットに参加していません。');
  }

  const info = get(channel.id);

  // Webhook の削除（存在すれば）
  try {
    const webhooks = await channel.fetchWebhooks();
    const wh = webhooks.find((w) => w.id === info.webhookId);
    if (wh) await wh.delete('Global chat bot による退出');
  } catch (err) {
    console.warn('Webhook削除に失敗（手動削除済みの可能性）:', err.message);
  }

  remove(channel.id);

  await interaction.editReply(
    `✅ **#${channel.name}** をグローバルチャットから退出しました。`
  );
}
