import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  WebhookClient,
  Events,
} from 'discord.js';
import * as deepl from 'deepl-node';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { getAll, has, getBannedUsers } from './registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

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

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
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

  const banned = getBannedUsers();
  if (banned.includes(message.author.id)) return;

  const channels = getAll();
  const sourceInfo = channels[message.channelId];
  const sourceLang = sourceInfo?.language ?? null;

  const targets = Object.entries(channels).filter(
    ([channelId]) => channelId !== message.channelId
  );

  if (targets.length === 0) return;

  const attachmentUrls = [...message.attachments.values()].map((a) => a.url);

  // サーバー名なしのユーザー名
  const username = (message.member?.displayName ?? message.author.username).slice(0, 80);
  const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 }) ?? undefined;

  await Promise.allSettled(
    targets.map(async ([channelId, info]) => {
      try {
        let content = message.content;

        // 翻訳（テキストがある場合のみ）
        if (content && info.language && info.language !== sourceLang) {
          try {
            const result = await translator.translateText(content, null, info.language);
            content = result.text;
          } catch (err) {
            console.error('翻訳失敗:', err.message);
          }
        }

        const finalContent = [content, ...attachmentUrls].filter(Boolean).join('\n') || null;

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
