/**
 * registry.js
 * グローバルチャットに参加しているチャンネルの管理
 * 本番運用ではSQLiteやRedisに差し替え推奨
 */

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

/**
 * channels.json の構造:
 * {
 *   "channelId": {
 *     "guildId": "...",
 *     "guildName": "...",
 *     "channelName": "...",
 *     "webhookId": "...",
 *     "webhookToken": "..."
 *   }
 * }
 */

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

export function list() {
  return Object.entries(loadChannels()).map(([channelId, info]) => ({
    channelId,
    ...info,
  }));
}

export function getBannedUsers() {
  ensureDataDir();
  if (!existsSync(BANNED_FILE)) return [];
  return JSON.parse(readFileSync(BANNED_FILE, 'utf-8'));
}

export function banUser(userId) {
  const banned = getBannedUsers();
  if (!banned.includes(userId)) {
    banned.push(userId);
    writeFileSync(BANNED_FILE, JSON.stringify(banned, null, 2));
  }
}

export function unbanUser(userId) {
  const banned = getBannedUsers().filter((id) => id !== userId);
  writeFileSync(BANNED_FILE, JSON.stringify(banned, null, 2));
}
