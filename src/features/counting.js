// カウント機能：1, 2, 3... と順番に数字を書いていく遊び
import { Events } from 'discord.js';
import { getChannel, save } from '../counting-store.js';

// 同じ人が2回連続で数えるのを禁止する（少人数なら false のままでOK）
const BLOCK_SAME_USER_TWICE = false;

export function register(client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.webhookId || !message.guildId) return;

    const state = getChannel(message.channelId);
    if (!state) return;

    // 全角数字も半角にして、数字だけのメッセージだけを対象にする（雑談はそのままOK）
    const text = message.content.normalize('NFKC').trim();
    if (!/^\d{1,15}$/.test(text)) return;
    const n = Number(text);

    const expected = state.current + 1;
    const sameUser = BLOCK_SAME_USER_TWICE && state.lastUserId === message.author.id;

    // 状態は先に更新する（連続で投稿されても順番がずれないように）
    if (n === expected && !sameUser) {
      state.current = n;
      state.lastUserId = message.author.id;
      if (n > state.best) state.best = n;
      save();
      await message.react('✅').catch((e) => console.error('リアクション失敗:', e.message));
      return;
    }

    const reached = state.current;
    state.current = 0;
    state.lastUserId = null;
    save();
    await message.react('❌').catch((e) => console.error('リアクション失敗:', e.message));
    const reason = sameUser ? '同じ人が続けて数えました' : `次は ${expected} でした`;
    await message.channel
      .send(`❌ ${message.author} がミス！(${reason})\n${reached} まで続きました。**1からやり直しです！** 🔁（最高記録: ${state.best}）`)
      .catch((e) => console.error('送信失敗:', e.message));
  });
}
