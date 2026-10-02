import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} from 'discord.js';
import { roleProblem } from '../features/roles.js';

const builder = new SlashCommandBuilder()
  .setName('rolepanel')
  .setDescription('ボタンでロールを付け外しできるパネルを作ります')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption((o) => o.setName('title').setDescription('パネルのタイトル').setRequired(true).setMaxLength(256))
  .addRoleOption((o) => o.setName('role1').setDescription('ロール1').setRequired(true));
for (let i = 2; i <= 5; i++) {
  builder.addRoleOption((o) => o.setName(`role${i}`).setDescription(`ロール${i}`));
}
builder.addStringOption((o) => o.setName('description').setDescription('説明文（改行は \\n）').setMaxLength(2000));

export const data = builder;

export async function execute(interaction) {
  const roles = [];
  for (let i = 1; i <= 5; i++) {
    const r = interaction.options.getRole(`role${i}`);
    if (r && !roles.some((x) => x.id === r.id)) roles.push(r);
  }

  for (const role of roles) {
    const problem = roleProblem(role);
    if (problem) {
      return interaction.reply({ content: `⚠️ **${role.name}**：${problem}`, flags: MessageFlags.Ephemeral });
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(interaction.options.getString('title'))
    .setColor(0x5865f2);
  const description = interaction.options.getString('description');
  if (description) embed.setDescription(description.replaceAll('\\n', '\n'));

  const row = new ActionRowBuilder().addComponents(
    roles.map((r) =>
      new ButtonBuilder()
        .setCustomId(`role:${r.id}`)
        .setLabel(r.name.slice(0, 80))
        .setStyle(ButtonStyle.Secondary)
    )
  );

  try {
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ パネルを作りました。', flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ 送れませんでした。Botがこのチャンネルに書き込めるか確認してください。', flags: MessageFlags.Ephemeral });
  }
}
