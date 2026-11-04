import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { enable, disable, getChannel } from '../counting-store.js';

export const data = new SlashCommandBuilder()
  .setName('counting')
  .setDescription('カウント機能の設定')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('set')
      .setDescription('このチャンネルでカウントを始める')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('対象のチャンネル（省略するとここ）').addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((s) =>
    s
      .setName('off')
      .setDescription('カウントをやめる')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('対象のチャンネル（省略するとここ）').addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((s) =>
    s.setName('status').setDescription('今の数字と最高記録を見る')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;

  if (sub === 'set') {
    const state = enable(channel.id, interaction.guildId);
    return interaction.reply({
      content: `✅ ${channel} でカウントを始めます。次は **${state.current + 1}** です！`,
      ephemeral: true,
    });
  }

  if (sub === 'off') {
    disable(channel.id);
    return interaction.reply({ content: `🛑 ${channel} のカウントをやめました。`, ephemeral: true });
  }

  const state = getChannel(channel.id);
  if (!state) {
    return interaction.reply({ content: `${channel} ではカウントしていません。`, ephemeral: true });
  }
  return interaction.reply({
    content: `🔢 ${channel}\n今: **${state.current}**（次は ${state.current + 1}）／最高記録: **${state.best}**`,
    ephemeral: true,
  });
}
