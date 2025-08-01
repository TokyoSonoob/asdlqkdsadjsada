const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

const allowedUserIds = ["849964668177088562", "571999000237178881","1010202066720936048"];

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.trim() !== "!set") return;

    if (!allowedUserIds.includes(message.author.id)) {
      await message.channel.send("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้");
      return;
    }

    try {
      await message.delete().catch(() => {});

      const categories = message.guild.channels.cache
        .filter((ch) => ch.type === ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);

      if (categories.size === 0) {
        await message.channel.send("❌ ไม่มีหมวดหมู่ในเซิร์ฟเวอร์นี้");
        return;
      }

      const options = categories.map((cat) => ({
        label: cat.name.substring(0, 100),
        value: cat.id,
        description: "เลือกให้ยศAdmin",
      })).slice(0, 25);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_categories")
        .setPlaceholder("เลือกหมวดหมู่")
        .setMinValues(1)
        .setMaxValues(options.length)
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle("Admin")
        .setDescription("โปรดเลือกหมวดหมู่")
        .setColor(0xFFFF00);

      const promptMsg = await message.channel.send({
        embeds: [embed],
        components: [row],
      });

      const collector = promptMsg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id && i.isStringSelectMenu(),
        time: 60000,
        max: 1,
      });

      collector.on("collect", async (interaction) => {
        try {
          await interaction.deferUpdate();

          const selectedCategoryIds = interaction.values;

          // หา role Admin ด้วยชื่อ "Admin"
          let adminRole = message.guild.roles.cache.find(r => r.name === "Admin");

          if (!adminRole) {
            adminRole = await message.guild.roles.create({
              name: "Admin",
              permissions: [PermissionsBitField.Flags.Administrator],
              color: 0xff0000,
              hoist: true,
              mentionable: true,
              reason: "สร้างยศ Admin ใหม่โดยอัตโนมัติ เพราะไม่พบในเซิร์ฟเวอร์",
            });
          }

          const everyoneRole = message.guild.roles.everyone;
          const channel = message.channel;

          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: false,
          });

          await channel.permissionOverwrites.edit(adminRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });

          for (const catId of selectedCategoryIds) {
            const category = message.guild.channels.cache.get(catId);
            if (!category) continue;
            await category.permissionOverwrites.edit(adminRole, {
              ViewChannel: true,
            });
          }

          await interaction.editReply({
            content: `✅ ตั้งค่าหมวดหมู่ให้ยศ Admin เรียบร้อยแล้ว!`,
            components: [],
            embeds: [],
          });

          console.log(`[!panel] User ${message.author.tag} ตั้งค่าหมวดหมู่ Admin สำเร็จ`);
        } catch (error) {
          console.error("[!panel] เกิดข้อผิดพลาด:", error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ เกิดข้อผิดพลาด กรุณาลองใหม่", ephemeral: true });
          }
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          message.channel.send("❌ หมดเวลาการเลือกหมวดหมู่ โปรดลองใช้คำสั่งใหม่อีกครั้ง");
          console.log("[!panel] หมดเวลาการเลือกหมวดหมู่");
        }
      });
    } catch (err) {
      console.error("[!panel] Error:", err);
      await message.channel.send("❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  });
};
