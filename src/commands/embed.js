import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType,
  AttachmentBuilder, MessageFlags,
} from 'discord.js';

const MAX_BYTES = 8 * 1024 * 1024;

export const data = new SlashCommandBuilder()
  .setName('embed')
  .setDescription('埋め込みメッセージを送ります')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((o) => o.setName('title').setDescription('タイトル').setRequired(true).setMaxLength(256))
  .addStringOption((o) => o.setName('description').setDescription('本文（改行したい所には \\n と書く）').setRequired(true).setMaxLength(4000))
  .addAttachmentOption((o) => o.setName('image_file').setDescription('画像をそのまま添付する（スマホの写真もOK）'))
  .addStringOption((o) => o.setName('color').setDescription('色（例: #5865F2）'))
  .addStringOption((o) => o.setName('image').setDescription('画像のURL（画像ファイルを使わない場合）'))
  .addStringOption((o) => o.setName('footer').setDescription('下に小さく出す文字').setMaxLength(200))
  .addChannelOption((o) =>
    o
      .setName('channel')
      .setDescription('送るチャンネル（省略すると今のチャンネル）')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );

export async function execute(interaction) {
  const flags = MessageFlags.Ephemeral;
  const color = interaction.options.getString('color');
  const imageUrl = interaction.options.getString('image');
  const file = interaction.options.getAttachment('image_file');
  const footer = interaction.options.getString('footer');

  if (color && !/^#?[0-9a-fA-F]{6}$/.test(color)) {
    return interaction.reply({ content: '⚠️ 色は `#5865F2` のように6桁で書いてください。', flags });
  }
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    return interaction.reply({ content: '⚠️ 画像のURLは `https://` から始まるものにしてください。', flags });
  }
  if (file) {
    if (!file.contentType?.startsWith('image/')) {
      return interaction.reply({ content: '⚠️ 画像ファイル（png・jpg・gif・webpなど）を選んでください。', flags });
    }
    if (file.size > MAX_BYTES) {
      return interaction.reply({ content: '⚠️ 画像が大きすぎます（8MBまで）。小さくしてからもう一度試してください。', flags });
    }
  }

  await interaction.deferReply({ flags });

  const embed = new EmbedBuilder()
    .setTitle(interaction.options.getString('title'))
    .setDescription(interaction.options.getString('description').replaceAll('\\n', '\n'))
    .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x5865f2);
  if (footer) embed.setFooter({ text: footer });

  const payload = { embeds: [embed] };

  if (file) {
    // 元のメッセージが消えても画像が残るように、Botが画像をアップロードし直す
    const ext = (file.name?.match(/\.(png|jpe?g|gif|webp)$/i)?.[0] ?? '.png').toLowerCase();
    const name = `image${ext}`;
    payload.files = [new AttachmentBuilder(file.url, { name })];
    embed.setImage(`attachment://${name}`);
  } else if (imageUrl) {
    embed.setImage(imageUrl);
  }

  const channel = interaction.options.getChannel('channel') ?? interaction.channel;

  try {
    await channel.send(payload);
    await interaction.editReply(`✅ <#${channel.id}> に送りました。`);
  } catch (err) {
    console.error(err);
    await interaction.editReply('❌ 送れませんでした。Botがそのチャンネルに書き込めるか、画像を送れる権限（ファイルの添付）があるか確認してください。');
  }
}
