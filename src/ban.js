import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { banUser, unbanUser, getBannedUsers } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-ban')
  .setDescription('グローバルチャットからユーザーをBAN/解除します')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('ユーザーをBANする')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('BANするユーザー').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('BANを解除する')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('BAN解除するユーザー').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('BANリストを表示する')
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const user = interaction.options.getUser('user');
    banUser(user.id);
    return interaction.editReply(`🔨 **${user.tag}** をグローバルチャットからBANしました。`);
  }

  if (sub === 'remove') {
    const user = interaction.options.getUser('user');
    unbanUser(user.id);
    return interaction.editReply(`✅ **${user.tag}** のBANを解除しました。`);
  }

  if (sub === 'list') {
    const banned = getBannedUsers();
    if (banned.length === 0) {
      return interaction.editReply('📋 BANリストは空です。');
    }
    return interaction.editReply(
      `🔨 **BANリスト (${banned.length}人)**\n${banned.map((id) => `<@${id}> (${id})`).join('\n')}`
    );
  }
}
