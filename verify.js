const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content !== "!verify") return;
    const allowedUsers = [
      "849964668177088562",
      "571999000237178881",
      "1010202066720936048"
    ];

    // เช็คว่า user ที่พิมพ์อยู่ในรายชื่อหรือไม่
    if (!allowedUsers.includes(message.author.id)) {
      await message.channel.send("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้");
      return;
    }
    const filterByUser = (m) => m.author.id === message.author.id;

    try {
      // Step 1: ขออิโมจิ
      const step1 = await message.channel.send("📌 โปรดส่งอิโมจิที่คุณต้องการใช้สำหรับการรับยศ");
      const emojiCollected = await message.channel.awaitMessages({
        filter: filterByUser,
        max: 1,
        errors: ["time"],
      });
      const emojiMsg = emojiCollected.first();
      const emoji = emojiMsg.content.trim();

      // Step 2: ขอชื่อยศ
      const step2 = await message.channel.send("📌 โปรดพิมพ์ชื่อยศที่คุณต้องการให้ผู้ใช้ได้รับเมื่อกดอิโมจิ");
      const roleCollected = await message.channel.awaitMessages({
        filter: filterByUser,
        max: 1,
        errors: ["time"],
      });
      const roleName = roleCollected.first().content.trim();

      // Step 3: ให้เลือกหมวดหมู่ที่ role นี้จะมองเห็นได้
      const categories = message.guild.channels.cache
        .filter(ch => ch.type === ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);

      if (categories.size === 0) {
        await message.channel.send("❌ ไม่มีหมวดหมู่ในเซิร์ฟเวอร์นี้");
        return;
      }

      const options = categories.map(cat => ({
        label: cat.name.substring(0, 100),
        value: cat.id,
        description: "Category",
      })).slice(0, 25);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_categories")
        .setPlaceholder("เลือกหมวดหมู่ที่ role นี้จะมองเห็นได้ (เลือกได้หลายหมวดหมู่)")
        .setMinValues(1)
        .setMaxValues(options.length)
        .addOptions(options);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const doneButton = new ButtonBuilder()
        .setCustomId("done")
        .setLabel("✅ เสร็จสิ้นการเลือก")
        .setStyle(ButtonStyle.Success);

      const buttonRow = new ActionRowBuilder().addComponents(doneButton);

      const promptMsg = await message.channel.send({
        content: "📌 กรุณาเลือกหมวดหมู่ที่จะให้ role นี้มองเห็นได้ แล้วกดปุ่ม 'เสร็จสิ้นการเลือก'",
        components: [selectRow, buttonRow],
      });

      const collector = promptMsg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
      });

      let selectedCategoryIds = [];

      collector.on("collect", async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId === "select_categories") {
          selectedCategoryIds = interaction.values;
        } else if (interaction.isButton() && interaction.customId === "done") {
          if (selectedCategoryIds.length === 0) {
            await interaction.reply({ content: "❌ กรุณาเลือกอย่างน้อย 1 หมวดหมู่ก่อนกดเสร็จสิ้น", ephemeral: true });
            return;
          }
          collector.stop("done");

          // ส่งข้อความชั่วคราวแล้วลบทีหลัง
          await interaction.update({ content: "⏳ กำลังตั้งค่าสิทธิ์และสร้างยศ...", components: [] });
        }
      });

      collector.on("end", async (_, reason) => {
        if (reason !== "done") {
          await message.channel.send("❌ ยกเลิกการเลือกหมวดหมู่ โปรดลองใหม่ด้วยคำสั่ง !verify");
          return;
        }

        // สร้าง role หากยังไม่มี
        let role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          role = await message.guild.roles.create({
            name: roleName,
            color: 0x9b59b6,
            reason: "สร้างโดยระบบ verify",
          });
        }

        // everyone มองไม่เห็นทุกช่อง (ยกเว้นช่องนี้)
        const everyoneRole = message.guild.roles.everyone;
        const allChannels = message.guild.channels.cache;

        for (const ch of allChannels.values()) {
          if (ch.id === message.channel.id) {
            await ch.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: true,
            }).catch(() => {});
          } else {
            await ch.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: false,
            }).catch(() => {});
          }
        }

        // role มองเห็นเฉพาะที่เลือก
        for (const ch of allChannels.values()) {
          if (ch.type === ChannelType.GuildCategory) {
            const canViewCategory = selectedCategoryIds.includes(ch.id);
            await ch.permissionOverwrites.edit(role, {
              ViewChannel: canViewCategory,
            }).catch(() => {});
          } else {
            if (ch.parentId) {
              const canViewParent = selectedCategoryIds.includes(ch.parentId);
              await ch.permissionOverwrites.edit(role, {
                ViewChannel: canViewParent,
              }).catch(() => {});
            } else {
              await ch.permissionOverwrites.edit(role, {
                ViewChannel: false,
              }).catch(() => {});
            }
          }
        }

        // *** เพิ่มบันทึกข้อมูลลง Firebase Firestore ***
        try {
          await db.collection("verifyRoles").doc(role.id).set({
            userId: message.author.id,
            roleId: role.id,
            roleName: role.name,
            emoji: emoji,
            selectedCategoryIds: selectedCategoryIds,
            channelId: message.channel.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log("✅ บันทึกข้อมูล verify ลง Firebase เรียบร้อย");
        } catch (e) {
          console.error("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล verify:", e);
        }

        // ลบข้อความทั้งหมดในห้อง
        try {
          const messages = await message.channel.messages.fetch({ limit: 100 });
          await message.channel.bulkDelete(messages, true);
        } catch (e) {
          console.error("ลบข้อความในห้องล้มเหลว:", e);
        }

        // ส่ง embed ให้กดอิโมจิรับยศ
        const embed = new EmbedBuilder()
          .setTitle("โปรดยืนยันตัวตน")
          .setDescription(`กดที่อิโมจิ ${emoji} เพื่อรับยศ **${role.name}**`)
          .setColor(0x9b59b6)
          .setImage("https://media.tenor.com/S4MdyoCR3scAAAAM/oblakao.gif")
          .setFooter({ text: "Make by Purple Shop" });

        const verifyMsg = await message.channel.send({ embeds: [embed] });
        await verifyMsg.react(emoji).catch(() => {
          message.channel.send("❌ ไม่สามารถเพิ่มอิโมจิได้");
        });

        // Step 7: รอ reaction เพื่อให้ role
        const reactionFilter = (reaction, user) =>
          reaction.emoji.name === emoji && !user.bot;

        const collectorReaction = verifyMsg.createReactionCollector({ filter: reactionFilter });

        collectorReaction.on("collect", async (reaction, user) => {
          const member = await reaction.message.guild.members.fetch(user.id);
          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch(() => {});
          }
        });
      });
    } catch (err) {
      console.error(err);
      await message.channel.send("เกิดข้อผิดพลาด โปรดลองใหม่โดยพิมพ์ `!verify` อีกครั้ง").catch(() => {});
    }
  });
};
