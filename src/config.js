import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DIR = './data';
const FILE = `${DIR}/settings.json`;

function load() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  if (!existsSync(FILE)) return {};
  return JSON.parse(readFileSync(FILE, 'utf-8'));
}

export function getSetting(guildId, key) {
  return load()[guildId]?.[key] ?? null;
}

export function setSetting(guildId, key, value) {
  const data = load();
  data[guildId] = { ...(data[guildId] ?? {}) };
  if (value === null) delete data[guildId][key];
  else data[guildId][key] = value;
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}
