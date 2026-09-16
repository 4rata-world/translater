/**
 * deploy-commands.js
 * スラッシュコマンドをDiscordに登録するスクリプト
 * 初回セットアップ時と、コマンドを追加・変更したときに実行する
 *
 * 実行: node src/deploy-commands.js
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = pathToFileURL(path.join(commandsPath, file)).href;
  const command = await import(filePath);
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`  ✔ ${command.data.name}`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

console.log(`\n📡 ${commands.length}個のコマンドを登録中...`);

const data = await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands }
);

console.log(`✅ ${data.length}個のスラッシュコマンドを登録しました！`);
