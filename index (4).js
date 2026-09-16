import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  WebhookClient,
  Events,
} from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { getAll, get, has, getBannedUsers } from './registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ────────────────────────────────────────────
// クライアント初期化
// ────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// スラッシュコマンドのロード
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

// ────────────────────────────────────────────
// Ready
// ────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

// ────────────────────────────────────────────
// スラッシュコマンド処理
// ────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    const reply = { content: '❌ コマンドの実行中にエラーが発生しました。', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// ────────────────────────────────────────────
// メッセージ転送
// ────────────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  // Bot / Webhook 由来のメッセージはスキップ（ループ防止）
  if (message.author.bot) return;
  if (message.webhookId) return;

  // このチャンネルがグローバルチャットに参加していなければスキップ
  if (!has(message.channelId)) return;

  // BANされたユーザーはスキップ
  const banned = getBannedUsers();
  if (banned.includes(message.author.id)) return;

  const channels = getAll();
  const sourceGuildId = message.guildId;

  // 転送先リスト（自分のチャンネル以外）
  const targets = Object.entries(channels).filter(
    ([channelId]) => channelId !== message.channelId
  );

  if (targets.length === 0) return;

  // 添付ファイルのURLを収集
  const attachmentUrls = [...message.attachments.values()].map((a) => a.url);

  // コンテンツの組み立て
  const content = [
    message.content,
    ...attachmentUrls,
  ].filter(Boolean).join('\n') || null;

  // Embeds をそのまま転送
  const embeds = message.embeds.slice(0, 10);

  // 送信者のアバターURL
  const avatarURL =
    message.author.displayAvatarURL({ extension: 'png', size: 128 }) ?? undefined;

  // サーバー名をユーザー名に付与: 「あらた [ServerName]」
  const username =
    `${message.member?.displayName ?? message.author.username} [${message.guild?.name ?? 'Unknown'}]`
      .slice(0, 80); // Discordのusername上限

  // 全ターゲットへ並列送信
  await Promise.allSettled(
    targets.map(async ([channelId, info]) => {
      try {
        const webhook = new WebhookClient({
          id: info.webhookId,
          token: info.webhookToken,
        });

        await webhook.send({
          content,
          embeds,
          username,
          avatarURL,
          threadId: info.threadId ?? undefined,
          allowedMentions: { parse: [] }, // メンション無効化
        });
      } catch (err) {
        console.error(`転送失敗 → ${channelId}:`, err.message);
      }
    })
  );
});

// ────────────────────────────────────────────
// 起動
// ────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
