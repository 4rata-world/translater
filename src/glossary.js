import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as deepl from 'deepl-node';

const DIR = './data';
const SLANG_FILE = `${DIR}/slang.json`;     // { "guildId|ja>en": { "ワード": "訳" } }
const IDS_FILE = `${DIR}/glossaries.json`;  // { "guildId|ja>en": "glossaryId" }

export const base = (code) => code.split('-')[0].toLowerCase();
const keyOf = (guildId, from, to) => `${guildId}|${base(from)}>${base(to)}`;

function load(file) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function save(file, data) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function getGlossaryId(guildId, from, to) {
  return load(IDS_FILE)[keyOf(guildId, from, to)] ?? null;
}

export function listEntries(guildId) {
  const prefix = `${guildId}|`;
  return Object.entries(load(SLANG_FILE))
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, entries]) => ({ pair: k.slice(prefix.length).toUpperCase(), entries }));
}

export function setEntry(guildId, from, to, word, translation) {
  const slang = load(SLANG_FILE);
  const key = keyOf(guildId, from, to);
  slang[key] = { ...(slang[key] ?? {}), [word]: translation };
  save(SLANG_FILE, slang);
}

export function removeEntry(guildId, from, to, word) {
  const slang = load(SLANG_FILE);
  const key = keyOf(guildId, from, to);
  if (!slang[key] || !(word in slang[key])) return false;
  delete slang[key][word];
  if (Object.keys(slang[key]).length === 0) delete slang[key];
  save(SLANG_FILE, slang);
  return true;
}

// DeepLの用語集は編集できないので、作り直して古いものを消す
export async function rebuild(translator, guildId, from, to) {
  const key = keyOf(guildId, from, to);
  const entries = load(SLANG_FILE)[key] ?? {};
  const ids = load(IDS_FILE);
  const oldId = ids[key];

  if (Object.keys(entries).length === 0) {
    if (oldId) await translator.deleteGlossary(oldId).catch(() => {});
    delete ids[key];
    save(IDS_FILE, ids);
    return;
  }

  const glossary = await translator.createGlossary(
    `${guildId}-${base(from)}-${base(to)}`,
    base(from),
    base(to),
    new deepl.GlossaryEntries({ entries })
  );
  ids[key] = glossary.glossaryId;
  save(IDS_FILE, ids);
  if (oldId) await translator.deleteGlossary(oldId).catch(() => {});
}
