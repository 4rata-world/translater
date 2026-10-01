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

  // 同じサーバー内の、他のチャンネルだけ
  const targets = Object.entries(channels).filter(
    ([channelId, info]) =>
      channelId !== message.channelId && info.guildId === message.guildId
  );
  if (targets.length === 0) return;
  const canTranslate = await translationAvailable();


  const attachmentUrls = [...message.attachments.values()].map((a) => a.url);
  const username = (message.member?.displayName ?? message.author.username).slice(0, 80);
  const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 }) ?? undefined;

  // 言語ごとに1回だけ翻訳する
  const cache = {};
  async function translateTo(lang) {
    if (!message.content || !lang || !canTranslate) return message.content;
    if (cache[lang] !== undefined) return cache[lang];
    try {
      const result = await translator.translateText(message.content, null, lang);
      cache[lang] = result.text;
    } catch (err) {
      console.error('翻訳失敗:', err.message);
      cache[lang] = message.content;
    }
    return cache[lang];
  }

  await Promise.allSettled(
    targets.map(async ([channelId, info]) => {
      try {
        const text = await translateTo(info.language);
        const finalContent = [text, ...attachmentUrls].filter(Boolean).join('\n') || null;

        const webhook = new WebhookClient({
          id: info.webhookId,
          token: info.webhookToken,
        });
        await webhook.send({
          content: finalContent,
          embeds: message.embeds.slice(0, 10),
          username,
          avatarURL,
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        console.error(`転送失敗 → ${channelId}:`, err.message);
      }
    })
  );
});

client.login(process.env.DISCORD_TOKEN);

