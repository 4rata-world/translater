import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  WebhookClient,
  Events,
  REST,
  Routes,
} from 'discord.js';
import * as deepl from 'deepl-node';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { getAll, has, getBannedUsers } from './registry.js';
import { getGlossaryId, base } from './glossary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

// DeepLの使用量を10分ごとに確認する
let usageCache = { at: 0, limitReached: false };
async function translationAvailable() {
  if (Date.now() - usageCache.at < 10 * 60 * 1000) return !usageCache.limitReached;
  try {
    const usage = await translator.getUsage();
    usageCache = { at: Date.now(), limitReached: usage.anyLimitReached() };
    if (usage.character) {
      const pct = Math.round((usage.character.count / usage.character.limit) * 100);
      if (pct >= 90) console.warn(`⚠️ DeepLの使用量が${pct}%です`);
    }
  } catch (err) {
    console.error('使用量の確認に失敗:', err.message);
    usageCache = { at: Date.now(), limitReached: false };
  }
  return !usageCache.limitReached;
}

// 元のメッセージID → { content, quote, guildId, srcLang, records }（削除・編集の連動用）
const forwarded = new Map();

// 言語ごとに1回だけ翻訳する関数を作る
// guildId と srcLang を渡すと、スラング辞書（用語集）があればそれを使う
function makeTranslateTo(content, canTranslate, guildId = null, srcLang = null) {
  const cache = {};
  return async function translateTo(lang) {
    if (!content || !lang || !canTranslate) return content;
    if (cache[lang] !== undefined) return cache[lang];
    try {
      const glossaryId = guildId && srcLang ? getGlossaryId(guildId, srcLang, lang) : null;
      let result;
      if (glossaryId) {
        try {
          result = await translator.translateText(content, base(srcLang), lang, {
            glossary: glossaryId,
          });
        } catch (err) {
          console.error('用語集つきの翻訳に失敗、通常の翻訳に切り替え:', err.message);
        }
      }
      result ??= await translator.translateText(content, null, lang);
      cache[lang] = result.text;
    } catch (err) {
      console.error('翻訳失敗:', err.message);
      cache[lang] = content;
    }
    return cache[lang];
  };
}

// 返信先の引用（名前と本文の冒頭）を作る
async function buildQuote(message) {
  if (!message.reference?.messageId) return null;
  try {
    const ref = await message.fetchReference();
    const name = (ref.member?.displayName ?? ref.author.username).slice(0, 40);
    let snippet = ref.content
      .split('\n')
      .filter((l) => !l.startsWith('> ') && !l.startsWith('-# '))
      .join(' ')
      .trim();
    if (snippet.length > 60) snippet = snippet.slice(0, 60) + '…';
    if (!snippet) snippet = ref.attachments.size > 0 ? '📎' : '';
    return snippet ? { name, snippet } : null;
  } catch {
    return null;
  }
}

// 転送先に送る本文を作る
async function render(message, info, translateTo, canTranslate, quote, quoteTranslateTo) {
  const text = await translateTo(info.language);

  let quoteLine = null;
  if (quote) {
    const q = (await quoteTranslateTo(info.language)).replace(/\n/g, ' ');
    quoteLine = `> ↩ **${quote.name}**: ${q}`;
  }

  const notice = !canTranslate && message.content && info.language
    ? '-# ⚠️ 翻訳の上限に達したため、原文のまま転送しています' : null;
  const attachmentUrls = [...message.attachments.values()].map((a) => a.url);

  const body = [quoteLine, text, notice, ...attachmentUrls].filter(Boolean).join('\n');
  return body ? body.slice(0, 2000) : null;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks,
  ],
  partials: [Partials.Message, Partials.Channel],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = pathToFileURL(path.join(commandsPath, file)).href;
  const command = await import(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(c.user.id), {
      body: [...client.commands.values()].map((cmd) => cmd.data.toJSON()),
    });
    console.log('✅ スラッシュコマンドを登録しました');
  } catch (err) {
    console.error('コマンド登録失敗:', err.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    const reply = { content: '❌ エラーが発生しました。', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.webhookId) return;
  if (!has(message.channelId)) return;

  const banned = getBannedUsers(message.guildId);
  if (banned.includes(message.author.id)) return;

  const channels = getAll();
  if (channels[message.channelId]?.paused) return;
  const srcLang = channels[message.channelId]?.language ?? null;


  // 同じサーバー内の、他のチャンネルだけ
  const targets = Object.entries(channels).filter(
    ([channelId, info]) =>
      channelId !== message.channelId && info.guildId === message.guildId
  );
  if (targets.length === 0) return;

  const canTranslate = await translationAvailable();
  const translateTo = makeTranslateTo(message.content, canTranslate, message.guildId, srcLang);

  const quote = await buildQuote(message);
  const quoteTranslateTo = makeTranslateTo(quote?.snippet, canTranslate);

  const username = (message.member?.displayName ?? message.author.username).slice(0, 80);
  const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 }) ?? undefined;

  const records = [];

  await Promise.allSettled(
    targets.map(async ([channelId, info]) => {
      try {
        const finalContent = await render(
          message, info, translateTo, canTranslate, quote, quoteTranslateTo
        );

        const webhook = new WebhookClient({
          id: info.webhookId,
          token: info.webhookToken,
        });
        const sent = await webhook.send({
          content: finalContent,
          embeds: message.embeds.slice(0, 10),
          username,
          avatarURL,
          allowedMentions: { parse: [] },
        });
        records.push({ info, id: sent.id });
      } catch (err) {
        console.error(`転送失敗 → ${channelId}:`, err.message);
      }
    })
  );

  // 削除・編集の連動用に記録（古いものから消して、最大2000件）
  if (records.length > 0) {
    forwarded.set(message.id, {
      content: message.content,
      quote,
      guildId: message.guildId,
      srcLang,
      records,
    });
    if (forwarded.size > 2000) forwarded.delete(forwarded.keys().next().value);
  }
});

// 元のメッセージが編集されたら、転送先も書き換える
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  const entry = forwarded.get(newMessage.id);
  if (!entry) return;

  if (newMessage.partial) {
    try {
      newMessage = await newMessage.fetch();
    } catch {
      return;
    }
  }

  // 本文が変わっていない更新（リンクのプレビュー表示など）は無視
  if (newMessage.content === entry.content) return;
  entry.content = newMessage.content;

  const canTranslate = await translationAvailable();
  const translateTo = makeTranslateTo(newMessage.content, canTranslate, entry.guildId, entry.srcLang);
  const quoteTranslateTo = makeTranslateTo(entry.quote?.snippet, canTranslate);

  await Promise.allSettled(
    entry.records.map(async ({ info, id }) => {
      try {
        const finalContent = await render(
          newMessage, info, translateTo, canTranslate, entry.quote, quoteTranslateTo
        );
        if (!finalContent) return;

        const webhook = new WebhookClient({
          id: info.webhookId,
          token: info.webhookToken,
        });
        await webhook.editMessage(id, {
          content: finalContent,
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        console.error('転送先の編集に失敗:', err.message);
      }
    })
  );
});

// 元のメッセージが消されたら、転送先も消す
client.on(Events.MessageDelete, async (message) => {
  const entry = forwarded.get(message.id);
  if (!entry) return;
  forwarded.delete(message.id);

  await Promise.allSettled(
    entry.records.map(async ({ info, id }) => {
      try {
        const webhook = new WebhookClient({
          id: info.webhookId,
          token: info.webhookToken,
        });
        await webhook.deleteMessage(id);
      } catch (err) {
        console.error('転送先の削除に失敗:', err.message);
      }
    })
  );
});

client.login(process.env.DISCORD_TOKEN);
