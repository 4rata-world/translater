// カウント機能のデータ保存（data/counting.json）
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'data');
const file = path.join(dir, 'counting.json');

// { [channelId]: { guildId, current, best, lastUserId } }
let data = {};
try {
  if (existsSync(file)) data = JSON.parse(readFileSync(file, 'utf-8'));
} catch (err) {
  console.error('counting.json の読み込みに失敗:', err.message);
}

function save() {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('counting.json の保存に失敗:', err.message);
  }
}

export const getChannel = (channelId) => data[channelId];
export const allChannels = () => data;

export function enable(channelId, guildId) {
  data[channelId] = data[channelId] ?? { guildId, current: 0, best: 0, lastUserId: null };
  data[channelId].guildId = guildId;
  save();
  return data[channelId];
}

export function disable(channelId) {
  delete data[channelId];
  save();
}

export { save };
