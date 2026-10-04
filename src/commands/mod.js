import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { sendLog } from '../features/logs.js';

export const data = new SlashCommandBuilder()
  .setName('mod')
  .setDescription('モデレーション')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((s) => s.setName('purge').setDescription('メッセージをまとめて削除（14日以内）')
    .addIntegerOption((o) => o.setName('count').setDescription('件数 1〜100').setMinValue(1).setMaxValue(100).setRequired(true))
    .addUserOption((o) => o.setName('user').setDescription('この人のだけ消す')))
  .addSubcommand((s) => s.setName('timeout').setDescription('タイムアウト（発言禁止）')
    .addUserOption((o) => o.setName('user').setDescription('対象').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('分（最大40320＝28日）').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由')))
  .addSubcommand((s) => s.setName('untimeout').setDescription('タイムアウトを解除')
    .addUserOption((o) => o.setName('user').setDescription('対象').setRequired(true)))
  .addSubcommand((s) => s.setName('kick').setDescription('キック')
    .addUserOption((o) => o.setName('user').setDescription('対象').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由')))
  .addSubcommand((s) => s.setName('ban').setDescription('サーバーからBAN')
    .addUserOption((o) => o.setName('user').setDescription('対象').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由')))
  .addSubcommand((s) => s.setName('unban').setDescription('BANを解除')
    .addStringOption((o) => o.setName('user_id').setDescription('ユーザーID').setRequired(true)));

const need = {
  purge: PermissionFlagsBits.ManageMessages,
  timeout: PermissionFlagsBits.ModerateMembers,
  untimeout: PermissionFlagsBits.ModerateMembers,
  kick: PermissionFlagsBits.KickMembers,
  ban: PermissionFlagsBits.BanMembers,
  unban: PermissionFlagsBits.BanMembers,
};

export async function execute(i) {
  const flags = MessageFlags.Ephemeral;
  const sub = i.options.getSubcommand();
  const err = (t) => i.reply({ content: `❌ ${t}`, flags });

  if (!i.memberPermissions.has(need[sub])) return err('その操作をする権限がありません。');
  if (!i.guild.members.me.permissions.has(need[sub])) return err('Botにその権限がありません。招待リンクの権限を更新してください。');

  const log = (title, color, desc) =>
    sendLog(i.guild, new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc).setFooter({ text: `実行: ${i.user.tag}` }).setTimestamp());

  if (sub === 'purge') {
    const count = i.options.getInteger('count');
    const user = i.options.getUser('user');
    await i.deferReply({ flags });
    let msgs = await i.channel.messages.fetch({ limit: 100 });
    if (user) msgs = msgs.filter((m) => m.author.id === user.id);
    const target = [...msgs.values()].slice(0, count);
    const done = await i.channel.bulkDelete(target, true);
    await log('🧹 一括削除', 0xeb459e, `<#${i.channelId}> で ${done.size} 件${user ? `（${user.tag}）` : ''}`);
    return i.editReply(`✅ ${done.size} 件削除しました。（14日より古いものは消せません）`);
  }

  if (sub === 'unban') {
    const id = i.options.getString('user_id').trim();
    try {
      await i.guild.bans.remove(id);
    } catch {
      return err('そのIDはBANされていないか、IDが正しくありません。');
    }
    await log('♻️ BAN解除', 0x57f287, `ID: ${id}`);
    return i.reply({ content: '✅ BANを解除しました。', flags });
  }

  const user = i.options.getUser('user');
  const reason = i.options.getString('reason') || '理由なし';
  if (user.id === i.user.id) return err('自分には使えません。');
  if (user.id === i.client.user.id) return err('Botには使えません。');
  const member = await i.guild.members.fetch(user.id).catch(() => null);

  if (sub === 'ban' && !member) {
    await i.guild.bans.create(user.id, { reason: `${i.user.tag}: ${reason}` });
    await log('🔨 BAN', 0xed4245, `${user.tag}\n理由: ${reason}`);
    return i.reply({ content: `✅ ${user.tag} をBANしました。`, flags });
  }
  if (!member) return err('そのユーザーはサーバーにいません。');
  if (member.id === i.guild.ownerId) return err('サーバーの持ち主には使えません。');
  if (i.user.id !== i.guild.ownerId && member.roles.highest.position >= i.member.roles.highest.position)
    return err('あなたと同じか上のロールの人には使えません。');

  try {
    if (sub === 'timeout') {
      if (!member.moderatable) return err('Botより上のロールの人には使えません。');
      const min = i.options.getInteger('minutes');
      await member.timeout(min * 60 * 1000, `${i.user.tag}: ${reason}`);
      await log('⏳ タイムアウト', 0xfee75c, `${user.tag}（${min}分）\n理由: ${reason}`);
      return i.reply({ content: `✅ ${user.tag} を ${min} 分タイムアウトしました。`, flags });
    }
    if (sub === 'untimeout') {
      if (!member.moderatable) return err('Botより上のロールの人には使えません。');
      await member.timeout(null);
      await log('✅ タイムアウト解除', 0x57f287, `${user.tag}`);
      return i.reply({ content: `✅ ${user.tag} のタイムアウトを解除しました。`, flags });
    }
    if (sub === 'kick') {
      if (!member.kickable) return err('Botより上のロールの人には使えません。');
      await member.kick(`${i.user.tag}: ${reason}`);
      await log('👢 キック', 0xe67e22, `${user.tag}\n理由: ${reason}`);
      return i.reply({ content: `✅ ${user.tag} をキックしました。`, flags });
    }
    if (sub === 'ban') {
      if (!member.bannable) return err('Botより上のロールの人には使えません。');
      await member.ban({ reason: `${i.user.tag}: ${reason}` });
      await log('🔨 BAN', 0xed4245, `${user.tag}\n理由: ${reason}`);
      return i.reply({ content: `✅ ${user.tag} をBANしました。`, flags });
    }
  } catch (e) {
    console.error(e);
    return err('実行に失敗しました。Botの権限とロールの順番を確認してください。');
  }
}
