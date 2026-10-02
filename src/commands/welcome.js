import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { getSetting, setSetting } from '../config.js';
import { roleProblem } from '../features/roles.js';

export const data = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('ようこそメッセージの設定')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('設定する')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('送るチャンネル').setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
      .addStringOption((o) =>
        o.setName('message').setDescription('{user}=メンション {server}=サーバー名 {count}=人数（改行は \\n）')
          .setRequired(true).setMaxLength(1000)
      )
      .addRoleOption((o) => o.setName('role').setDescription('入った人に自動で付けるロール'))
      .addStringOption((o) =>
        o.setName('leave_message').setDescription('退出時のメッセージ（{name}=名前）').setMaxLength(500)
      )
  )
  .addSubcommand((sub) => sub.setName('off').setDescription('オフにする'))
  .addSubcommand((sub) => sub.setName('show').setDescription('今の設定を見る'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

  if (sub === 'off') {
    setSetting(guildId, 'welcome', null);
    return reply('✅ ようこそメッセージをオフにしました。');
  }

  if (sub === 'show') {
    const cfg = getSetting(guildId, 'welcome');
    if (!cfg) return reply('📭 まだ設定されていません。');
    return reply(
      [
        `チャンネル：<#${cfg.channelId}>`,
        `メッセージ：${cfg.message}`,
        `自動ロール：${cfg.roleId ? `<@&${cfg.roleId}>` : 'なし'}`,
        `退出メッセージ：${cfg.leaveMessage ?? 'なし'}`,
      ].join('\n')
    );
  }

  const role = interaction.options.getRole('role');
  if (role) {
    const problem = roleProblem(role);
    if (problem) return reply(`⚠️ ${problem}`);
  }

  setSetting(guildId, 'welcome', {
    channelId: interaction.options.getChannel('channel').id,
    message: interaction.options.getString('message').replaceAll('\\n', '\n'),
    roleId: role?.id ?? null,
    leaveMessage: interaction.options.getString('leave_message')?.replaceAll('\\n', '\n') ?? null,
  });

  return reply('✅ 設定しました。新しい人が入ると、メッセージが送られます。');
}
