import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('embed')
  .setDescription('埋め込みメッセージを送ります')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((o) => o.setName('title').setDescription('タイトル').setRequired(true).setMaxLength(256))
  .addStringOption((o) => o.setName('description').setDescription('本文（改行したい所には \\n と書く）').setRequired(true).setMaxLength(4000))
  .addStringOption((o) => o.setName('color').setDescription('色（例: #5865F2）'))
  .addStringOption((o) => o.setName('image').setDescription('画像のURL'))
  .addStringOption((o) => o.setName('footer').setDescription('下に小さく出す文字').setMaxLength(200))
  .addChannelOption((o) =>
    o
      .setName('channel')
      .setDescription('送るチャンネル（省略すると今のチャンネル）')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );

export async function execute(interaction) {
  const color = interaction.options.getString('color');
  const image = interaction.options.getString('image');
  const footer = interaction.options.getString('footer');

  if (color && !/^#?[0-9a-fA-F]{6}$/.test(color)) {
    return interaction.reply({ content: '⚠️ 色は `#5865F2` のように6桁で書いてください。', flags: MessageFlags.Ephemeral });
  }
  if (image && !/^https?:\/\//.test(image)) {
    return interaction.reply({ content: '⚠️ 画像は `https://` から始まるURLにしてください。', flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(interaction.options.getString('title'))
    .setDescription(interaction.options.getString('description').replaceAll('\\n', '\n'))
    .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x5865f2);
  if (image) embed.setImage(image);
  if (footer) embed.setFooter({ text: footer });

  const channel = interaction.options.getChannel('channel') ?? interaction.channel;

  try {
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ <#${channel.id}> に送りました。`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ 送れませんでした。Botがそのチャンネルに書き込めるか確認してください。', flags: MessageFlags.Ephemeral });
  }
}
