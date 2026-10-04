import { Events, EmbedBuilder } from 'discord.js';
import { getSetting } from '../config.js';

export async function sendLog(guild, embed) {
  try {
    const id = getSetting(guild.id, 'logChannel');
    if (!id) return;
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch?.isTextBased()) return;
    await ch.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (e) {
    console.error('ログ送信失敗:', e.message);
  }
}

const cut = (s, n = 900) => (s && s.length > n ? s.slice(0, n) + '…' : s || '（なし）');

export function register(client) {
  client.on(Events.MessageDelete, async (m) => {
    if (!m.guild || m.author?.bot || m.webhookId) return;
    if (!m.author) return; // キャッシュに無い
    await sendLog(m.guild, new EmbedBuilder().setColor(0xed4245).setTitle('🗑 メッセージ削除')
      .setDescription(`<#${m.channelId}> / ${m.author} (${m.author.tag})\n${cut(m.content)}`).setTimestamp());
  });

  client.on(Events.MessageUpdate, async (a, b) => {
    if (!b.guild || b.author?.bot || b.webhookId) return;
    if (!a.content || a.content === b.content) return;
    await sendLog(b.guild, new EmbedBuilder().setColor(0xfee75c).setTitle('✏️ メッセージ編集')
      .setDescription(`<#${b.channelId}> / ${b.author} ([開く](${b.url}))`)
      .addFields({ name: '前', value: cut(a.content, 1000) }, { name: '後', value: cut(b.content, 1000) }).setTimestamp());
  });

  client.on(Events.GuildMemberAdd, async (m) => {
    await sendLog(m.guild, new EmbedBuilder().setColor(0x57f287).setTitle('📥 参加')
      .setDescription(`${m} (${m.user.tag})`).setTimestamp());
  });

  client.on(Events.GuildMemberRemove, async (m) => {
    await sendLog(m.guild, new EmbedBuilder().setColor(0x99aab5).setTitle('📤 退出')
      .setDescription(`${m.user.tag}`).setTimestamp());
  });
}
