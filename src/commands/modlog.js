import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { getSetting, setSetting } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('modlog')
  .setDescription('ログを送るチャンネルの設定（削除・編集・参加退出・管理操作）')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((s) => s.setName('set').setDescription('ログのチャンネルを設定')
    .addChannelOption((o) => o.setName('channel').setDescription('送り先').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand((s) => s.setName('off').setDescription('ログをやめる'))
  .addSubcommand((s) => s.setName('show').setDescription('今の設定を見る'));

export async function execute(i) {
  const sub = i.options.getSubcommand();
  const flags = MessageFlags.Ephemeral;
  if (sub === 'set') {
    const ch = i.options.getChannel('channel');
    const me = ch.permissionsFor(i.guild.members.me);
    if (!me?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
      return i.reply({ content: '❌ そのチャンネルにBotが送信できません。権限を確認してください。', flags });
    }
    setSetting(i.guildId, 'logChannel', ch.id);
    return i.reply({ content: `✅ ログを ${ch} に送ります。`, flags });
  }
  if (sub === 'off') {
    setSetting(i.guildId, 'logChannel', null);
    return i.reply({ content: '✅ ログをオフにしました。', flags });
  }
  const id = getSetting(i.guildId, 'logChannel');
  return i.reply({ content: id ? `📋 ログの送り先: <#${id}>` : '📋 ログは設定されていません。', flags });
}
