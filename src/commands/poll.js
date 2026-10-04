import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('アンケートを作る（リアクションで投票）')
  .addStringOption((o) => o.setName('question').setDescription('質問').setMaxLength(250).setRequired(true))
  .addStringOption((o) => o.setName('options').setDescription('選択肢を「,」で区切る（2〜10個）。空なら⭕/❌').setMaxLength(800));

export async function execute(i) {
  const q = i.options.getString('question');
  const raw = i.options.getString('options');
  let items;
  let emojis;
  if (raw) {
    items = raw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
    if (items.length < 2 || items.length > 10)
      return i.reply({ content: '❌ 選択肢は2〜10個にしてください。', ephemeral: true });
    emojis = NUM.slice(0, items.length);
  } else {
    items = ['賛成', '反対'];
    emojis = ['⭕', '❌'];
  }
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📊 ${q}`)
    .setDescription(items.map((t, n) => `${emojis[n]} ${t}`).join('\n'))
    .setFooter({ text: `作成: ${i.user.tag}` });
  const msg = await i.reply({ embeds: [embed], fetchReply: true });
  for (const e of emojis) await msg.react(e).catch(() => {});
}
