import { Events } from 'discord.js';
import { getSetting } from '../config.js';
import { roleProblem } from './roles.js';

function fill(text, member) {
  return text
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{name}', member.user?.username ?? '誰か')
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{count}', String(member.guild.memberCount));
}

export function register(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    const cfg = getSetting(member.guild.id, 'welcome');
    if (!cfg) return;

    if (cfg.roleId) {
      try {
        const role = member.guild.roles.cache.get(cfg.roleId);
        if (role && !roleProblem(role)) await member.roles.add(role);
      } catch (err) {
        console.error('自動ロールの付与に失敗:', err.message);
      }
    }

    try {
      const channel = await member.guild.channels.fetch(cfg.channelId);
      await channel.send({
        content: fill(cfg.message, member),
        allowedMentions: { users: [member.id] },
      });
    } catch (err) {
      console.error('ようこそメッセージの送信に失敗:', err.message);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const cfg = getSetting(member.guild.id, 'welcome');
    if (!cfg?.leaveMessage) return;
    try {
      const channel = await member.guild.channels.fetch(cfg.channelId);
      await channel.send({
        content: fill(cfg.leaveMessage, member),
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('退出メッセージの送信に失敗:', err.message);
    }
  });
}
