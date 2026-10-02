import { SlashCommandBuilder, PermissionFlagsBits, WebhookClient } from 'discord.js';
import * as deepl from 'deepl-node';
import { list } from '../registry.js';

export const data = new SlashCommandBuilder()
  .setName('global-announce')
  .setDescription('つながっている全チャンネルにお知らせを送ります')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName('text')
      .setDescription('お知らせの内容（改行したい所には \\n と書く）')
      .setRequired(true)
      .setMaxLength(1500)
  );

export async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const text = interaction.options.getString('text').replaceAll('\\n', '\n');
  const channels = list(interaction.guildId);

  if (channels.length === 0) {
    return interaction.editReply('📭 つながっているチャンネルがありません。');
  }

  const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
  const cache = {};
  async function translateTo(lang) {
    if (!lang) return text;
    if (cache[lang] !== undefined) return cache[lang];
    try {
      cache[lang] = (await translator.translateText(text, null, lang)).text;
    } catch (err) {
      console.error('翻訳失敗:', err.message);
      cache[lang] = text;
    }
    return cache[lang];
  }

  const avatarURL = client.user.displayAvatarURL({ extension: 'png', size: 128 });
  let ok = 0;

  await Promise.allSettled(
    channels.map(async (c) => {
      try {
        const webhook = new WebhookClient({ id: c.webhookId, token: c.webhookToken });
        await webhook.send({
          content: (await translateTo(c.language)).slice(0, 2000),
          username: '📢 お知らせ / Announcement',
          avatarURL,
          allowedMentions: { parse: [] },
        });
        ok++;
      } catch (err) {
        console.error(`お知らせの送信に失敗 → ${c.channelId}:`, err.message);
      }
    })
  );

  await interaction.editReply(`✅ ${ok} / ${channels.length} チャンネルに送りました。`);
}
