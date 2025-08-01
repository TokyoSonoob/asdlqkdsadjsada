const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (
      message.content === "!panel" &&
      message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      const embed = new EmbedBuilder()
        .setTitle("𝑨𝒅𝒎𝒊𝒏 𝑷𝒂𝒏𝒆𝒍")
        .setColor(0x9b59b6)
        .setImage("https://media.tenor.com/S4MdyoCR3scAAAAM/oblakao.gif")
        .setDescription("มีปัญหาให้ทักไปที่ดิส 𝐒𝐞𝐚 𝐦𝐮𝐰𝐰 乂");

      const createRoleButton = new ButtonBuilder()
        .setCustomId("create_role")
        .setLabel("สร้างยศ")
        .setStyle(ButtonStyle.Primary);

      const deleteRoleButton = new ButtonBuilder()
        .setCustomId("delete_role")
        .setLabel("ลบยศ")
        .setStyle(ButtonStyle.Danger);
      const moveUserButton = new ButtonBuilder()
      .setCustomId("move_user")
      .setLabel("พาเข้าสัมภาษณ์")
      .setStyle(ButtonStyle.Secondary);
      const gatherAdminButton = new ButtonBuilder()
      .setCustomId("gather_admin")
      .setLabel("รวมตัวแอดมิน")
      .setStyle(ButtonStyle.Success);
      

      const row = new ActionRowBuilder().addComponents(createRoleButton, deleteRoleButton, moveUserButton, gatherAdminButton);

      await message.channel.send({ embeds: [embed], components: [row] });
      try {
        await message.delete();
      } catch (error) {
        console.error("❌ ลบข้อความ !panel ไม่สำเร็จ:", error);
      }
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId === "create_role") {
        const modal = new ModalBuilder()
          .setCustomId("create_role_modal")
          .setTitle("สร้างยศใหม่");

        const roleNameInput = new TextInputBuilder()
          .setCustomId("role_name")
          .setLabel("ชื่อยศที่ต้องการสร้าง")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const modalRow = new ActionRowBuilder().addComponents(roleNameInput);
        modal.addComponents(modalRow);

        await interaction.showModal(modal);
      } else if (interaction.customId === "delete_role") {
        const guild = interaction.guild;

        const roles = guild.roles.cache
          .filter(
            (r) =>
              !r.managed &&
              r.editable &&
              r.id !== guild.id &&
              r.name.toLowerCase() !== "admin"
          )
          .map((role) => ({
            label: role.name.length > 25 ? role.name.slice(0, 25) : role.name,
            value: role.id,
          }))
          .slice(0, 25);

        if (roles.length === 0) {
          await interaction.reply({
            content: "❌ ไม่มียศให้ลบในเซิร์ฟเวอร์นี้",
            ephemeral: true,
          });
          return;
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_role_to_delete")
          .setPlaceholder("เลือกยศที่จะลบ")
          .addOptions(roles)
          .setMinValues(1)
          .setMaxValues(Math.min(roles.length, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
          content: "🗑️ กรุณาเลือกยศที่คุณต้องการลบ",
          components: [row],
          ephemeral: true,
        });
      }
      else if (interaction.customId === "move_user") {
  const member = interaction.member;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel || !voiceChannel.parentId) {
    return interaction.reply({
      content: "❌ คุณต้องอยู่ในห้องเสียงที่อยู่ในหมวดหมู่ก่อนถึงจะใช้ปุ่มนี้ได้",
      ephemeral: true,
    });
  }

  const guild = interaction.guild;
  const categoryId = voiceChannel.parentId;

  // ดึงทุกห้องเสียงในหมวดหมู่เดียวกัน
  const channelsInCategory = guild.channels.cache.filter(
    (c) => c.parentId === categoryId && c.type === ChannelType.GuildVoice
  );

  // รวมสมาชิกที่อยู่ในทุกห้องเสียง (ยกเว้นบอท)
  const membersInCategory = new Map();

  for (const [channelId, ch] of channelsInCategory) {
    for (const [memberId, m] of ch.members) {
      if (!m.user.bot) {
        membersInCategory.set(memberId, m);
      }
    }
  }

  if (membersInCategory.size === 0) {
    return interaction.reply({
      content: "❌ ไม่มีสมาชิกที่ออนไลน์ในหมวดหมู่ห้องเสียงนี้",
      ephemeral: true,
    });
  }

  const userOptions = Array.from(membersInCategory.values()).map((m) => ({
    label: m.user.username.length > 25 ? m.user.username.slice(0, 25) : m.user.username,
    value: m.id,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId("move_user_select")
    .setPlaceholder("เลือกคนที่คุณต้องการพาเข้าสัมภาษณ์")
    .addOptions(userOptions)
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(select);

  const embed = new EmbedBuilder()
    .setTitle("รายชื่อสมาชิกในหมวดหมู่เดียวกัน")
    .setDescription("เลือกคนที่คุณต้องการพาเข้าสัมภาษณ์")
    .setColor(0x9b59b6);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}
if (interaction.isButton()) {
  // ปุ่มรวมตัวแอดมิน กดแล้วแสดงข้อความยืนยัน
  if (interaction.customId === "gather_admin") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("gather_admin_confirm")
        .setLabel("ยืนยัน")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("gather_admin_cancel")
        .setLabel("ยกเลิก")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "แน่ใจหรือไม่ว่าต้องการรวมตัวแอดมินเข้าห้องเสียงนี้?",
      components: [confirmRow],
      ephemeral: true,
    });
  }
  else if (interaction.customId === "gather_admin_confirm") {
    // ดึงห้องเสียงของคนกด
    const requester = interaction.member;
    const voiceChannel = requester.voice.channel;

    if (!voiceChannel) {
      return interaction.update({
        content: "❌ คุณต้องอยู่ในห้องเสียงเพื่อใช้คำสั่งนี้",
        components: [],
      });
    }

    const guild = interaction.guild;
    // ดึง role "Admin" (ชื่อแบบ case insensitive)
    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === "admin");
    if (!adminRole) {
      return interaction.update({
        content: "❌ ไม่พบยศชื่อ Admin ในเซิร์ฟเวอร์นี้",
        components: [],
      });
    }

    // สมาชิกที่มี role admin
    const adminMembers = adminRole.members.filter(m => m.voice.channel && m.id !== requester.id);

    // หากไม่มีแอดมินที่อยู่ในห้องเสียง
    if (adminMembers.size === 0) {
      return interaction.update({
        content: "❌ ไม่มีแอดมินคนอื่นที่อยู่ในห้องเสียงใด ๆ เพื่อย้ายเข้าห้องนี้",
        components: [],
      });
    }

    // ย้ายสมาชิกเหล่านั้นเข้าห้องของ requester
    let successCount = 0;
    let failCount = 0;

    for (const [memberId, member] of adminMembers) {
      try {
        await member.voice.setChannel(voiceChannel);
        successCount++;
      } catch {
        failCount++;
      }
    }

    await interaction.update({
      content: `✅ ย้ายแอดมินทั้งหมดที่อยู่ในห้องเสียงเข้ามาห้องนี้เรียบร้อย\n- ย้ายสำเร็จ: ${successCount}\n- ล้มเหลว: ${failCount}`,
      components: [],
    });
  }
  else if (interaction.customId === "gather_admin_cancel") {
    await interaction.update({
      content: "❌ ยกเลิกการรวมตัวแอดมิน",
      components: [],
    });
  }
}

    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "select_role_to_delete") {
        const roleIds = interaction.values;
        const guild = interaction.guild;

        await interaction.update({
          content: `โปรดรอสักครู่...`,
          components: [],
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));

        let successDeleted = [];
        let failedDeleted = [];

        for (const roleId of roleIds) {
          const role = await guild.roles.fetch(roleId).catch(() => null);
          if (!role) {
            failedDeleted.push(`❌ ไม่พบยศ ID: ${roleId}`);
            continue;
          }

          if (role.id === guild.id || role.name.toLowerCase() === "admin") {
            failedDeleted.push(`❌ ไม่สามารถลบยศ **${role.name}** ได้`);
            continue;
          }

          try {
            await role.delete("ลบยศโดยผู้ดูแลระบบผ่าน panel");
            successDeleted.push(`✅ ลบยศ **${role.name}** เรียบร้อยแล้ว`);
          } catch (error) {
            failedDeleted.push(`❌ ลบยศ **${role.name}** ไม่สำเร็จ: ${error.message}`);
          }
        }

        const content =
          successDeleted.join("\n") +
          (failedDeleted.length > 0 ? "\n\n" + failedDeleted.join("\n") : "");

        // ส่งข้อความลบยศสำเร็จ/ไม่สำเร็จ แบบ ephemeral
        await interaction.followUp({ content, ephemeral: true });
      } else if (interaction.customId === "select_categories") {
        try {
          await interaction.deferReply({ ephemeral: true });
        } catch (error) {
          console.warn("⚠️ ไม่สามารถ defer interaction ได้:", error.message);
          return;
        }

        const selectedCategoryIds = interaction.values;
        const guild = interaction.guild;

        const footerText = interaction.message.embeds[0]?.footer?.text;
        if (!footerText || !footerText.includes("|")) {
          return interaction.editReply({ content: "❌ ไม่พบข้อมูลยศ" });
        }

        const [roleId, roleName] = footerText.split("|");
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          return interaction.editReply({ content: "❌ ไม่พบยศ" });
        }

        for (const categoryId of selectedCategoryIds) {
          const category = guild.channels.cache.get(categoryId);
          if (!category || category.type !== ChannelType.GuildCategory) continue;

          try {
            await category.permissionOverwrites.edit(role, { ViewChannel: true });
          } catch (err) {
            console.error(`❌ แก้ไข permission ไม่สำเร็จใน ${category.name}:`, err);
          }
        }

        await interaction.editReply({
          content: `✅ สร้างยศ **${roleName}** สำเร็จ`,
          components: [],
          embeds: [],
        });
      }
      else if (interaction.customId === "move_user_select") {
  const selectedUserId = interaction.values[0];
  const guild = interaction.guild;
  const requester = interaction.member; // คนกดปุ่ม A
  const requesterVoiceChannel = requester.voice.channel;

  if (!requesterVoiceChannel) {
    return interaction.update({
      content: "❌ คุณไม่ได้อยู่ในห้องเสียงแล้ว",
      components: [],
      embeds: [],
    });
  }

  const memberToMove = await guild.members.fetch(selectedUserId).catch(() => null);
  if (!memberToMove) {
    return interaction.update({
      content: "❌ ไม่พบสมาชิกที่ต้องการย้าย",
      components: [],
      embeds: [],
    });
  }

  // ย้ายสมาชิกที่ถูกเลือก (B) ไปยังห้องเสียงของคนกด (A)
  try {
    await memberToMove.voice.setChannel(requesterVoiceChannel);
    await interaction.update({
      content: `✅ กำลังย้าย <@${selectedUserId}> มาห้อง <#${requesterVoiceChannel.id}> ของคุณ`,
      components: [],
      embeds: [],
    });
  } catch (error) {
    await interaction.update({
      content: `❌ ไม่สามารถย้าย <@${selectedUserId}> ได้: ${error.message}`,
      components: [],
      embeds: [],
    });
  }
}


    } else if (interaction.isModalSubmit() && interaction.customId === "create_role_modal") {
      const roleName = interaction.fields.getTextInputValue("role_name").trim();
      const guild = interaction.guild;

      const existing = guild.roles.cache.find((r) => r.name === roleName);
      if (existing) {
        await interaction.reply({
          content: "⚠️ ยศนี้มีอยู่แล้ว",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `โปรดรอสักครู่...`,
        ephemeral: true,
      });

      const role = await guild.roles.create({ name: roleName });

      const categoryChannels = guild.channels.cache
        .filter((ch) => ch.type === ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position)
        .map((ch) => ({ label: ch.name, value: ch.id }))
        .slice(0, 25);

      if (categoryChannels.length === 0) {
        await interaction.followUp({
          content: "❌ ไม่พบหมวดหมู่ใด ๆ ในเซิร์ฟเวอร์",
          ephemeral: true,
        });
        return;
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_categories")
        .setPlaceholder("เลือกหมวดหมู่")
        .setMinValues(1)
        .setMaxValues(categoryChannels.length)
        .addOptions(categoryChannels);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle("เลือกหมวดหมู่ที่ยศนี้จะเห็นได้")
        .setColor(0x9b59b6)
        .setDescription(`# ยศ: **${role.name}**`)
        .setFooter({ text: `${role.id}|${role.name}` });

      await interaction.followUp({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    }
  });
};
