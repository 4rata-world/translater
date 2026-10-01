import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DATA_DIR = './data';
const CHANNELS_FILE = `${DATA_DIR}/channels.json`;
const BANNED_FILE = `${DATA_DIR}/banned.json`;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadChannels() {
  ensureDataDir();
  if (!existsSync(CHANNELS_FILE)) return {};
  return JSON.parse(readFileSync(CHANNELS_FILE, 'utf-8'));
}

function saveChannels(data) {
  ensureDataDir();
  writeFileSync(CHANNELS_FILE, JSON.stringify(data, null, 2));
}

export function getAll() {
  return loadChannels();
}

export function get(channelId) {
  return loadChannels()[channelId] ?? null;
}

export function add(channelId, info) {
  const data = loadChannels();
  data[channelId] = info;
  saveChannels(data);
}

export function remove(channelId) {
  const data = loadChannels();
  delete data[channelId];
  saveChannels(data);
}

export function has(channelId) {
  return channelId in loadChannels();
}

// guildId を渡すと、そのサーバーのチャンネルだけ返す
export function list(guildId) {
  return Object.entries(loadChannels())
    .filter(([, info]) => !guildId || info.guildId === guildId)
    .map(([channelId, info]) => ({ channelId, ...info }));
}

// BANリストはサーバーごと: { "guildId": ["userId", ...] }
function loadBanned() {
  ensureDataDir();
  if (!existsSync(BANNED_FILE)) return {};
  const data = JSON.parse(readFileSync(BANNED_FILE, 'utf-8'));
  return Array.isArray(data) ? {} : data; // 旧形式（全サーバー共通）は破棄
}

function saveBanned(data) {
  ensureDataDir();
  writeFileSync(BANNED_FILE, JSON.stringify(data, null, 2));
}

export function getBannedUsers(guildId) {
  return loadBanned()[guildId] ?? [];
}

export function banUser(guildId, userId) {
  const data = loadBanned();
  const banned = data[guildId] ?? [];
  if (!banned.includes(userId)) banned.push(userId);
  data[guildId] = banned;
  saveBanned(data);
}

export function unbanUser(guildId, userId) {
  const data = loadBanned();
  data[guildId] = (data[guildId] ?? []).filter((id) => id !== userId);
  saveBanned(data);
}
