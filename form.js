const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const admin = require("firebase-admin");
const db = admin.firestore();
const tempFormData = new Map();

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!form")) return;

    const args = message.content.trim().split(" ");
    if (args.length < 2) return;

    const targetChannelId = args[1];
    const serverId = message.guild.id;

    try {
      await message.delete();
    } catch (e) {
      console.log("⚠️ ลบข้อความไม่สำเร็จ:", e.message);
    }

    await db.collection("formChannels").doc(serverId).set({
      channelId: targetChannelId,
    });

    const embed = new EmbedBuilder()
    .setTitle("กรุณากรอกฟอร์ม")
    .setDescription("หลังจากกรอกฟอร์ม ทางเราจะตรวจสอบ และ นัดสัมภาษณ์อีกครั้งหนึ่ง")
      .setColor(0x9b59b6)
      .setImage("https://i.pinimg.com/originals/29/54/f6/2954f6fb5fa96cd38b989e265015c30e.gif")
      .setFooter({ text: "Make by Purple Shop" });

    const button = new ButtonBuilder()
      .setCustomId("open_form_page1")
      .setLabel("กรอกฟอร์ม")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    await message.channel.send({ embeds: [embed], components: [row] });
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId === "open_form_page1") {
        // Modal หน้า 1
        const modal = new ModalBuilder()
          .setCustomId("ic_form_page1")
          .setTitle("แบบฟอร์ม- หน้า 1");

        const inputs = [
          new TextInputBuilder()
            .setCustomId("ic_name")
            .setLabel("ชื่อ IC")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),

          new TextInputBuilder()
            .setCustomId("ic_age")
            .setLabel("อายุ")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),

          new TextInputBuilder()
            .setCustomId("ic_gender")
            .setLabel("เพศ")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),

          new TextInputBuilder()
            .setCustomId("ic_trait")
            .setLabel("นิสัย")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),

          new TextInputBuilder()
            .setCustomId("ic_like")
            .setLabel("ของที่ชอบ")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ];

        const rows = inputs.map((input) => new ActionRowBuilder().addComponents(input));
        modal.addComponents(...rows);

        await interaction.showModal(modal);
      } else if (interaction.customId === "open_form_page2") {
        // Modal หน้า 2
        const modal = new ModalBuilder()
  .setCustomId("ic_form_page2")
  .setTitle("แบบฟอร์ม หน้า 2");

const inputs = [
  new TextInputBuilder()
    .setCustomId("ic_dislike")
    .setLabel("ของที่ไม่ชอบ")
    .setStyle(TextInputStyle.Short)
    .setRequired(true),

  new TextInputBuilder()
    .setCustomId("ic_history")
    .setLabel("ประวัติ")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true),

  new TextInputBuilder()
    .setCustomId("ic_want_role")
    .setLabel("อยากโรลเป็นอะไร / ทำไมถึงอยากโรล")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true),

  new TextInputBuilder()
    .setCustomId("ic_places")
    .setLabel("ตอนนี้เล่นอยู่กี่ที่")
    .setStyle(TextInputStyle.Short)
    .setRequired(true),
];


        const rows = inputs.map((input) => new ActionRowBuilder().addComponents(input));
        modal.addComponents(...rows);

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === "ic_form_page1") {
        // รับข้อมูลหน้า 1
        const userId = interaction.user.id;

        const dataPage1 = {
          name: interaction.fields.getTextInputValue("ic_name"),
          age: interaction.fields.getTextInputValue("ic_age"),
          gender: interaction.fields.getTextInputValue("ic_gender"),
          trait: interaction.fields.getTextInputValue("ic_trait"),
          like: interaction.fields.getTextInputValue("ic_like"),
        };

        // เก็บใน memory ชั่วคราว
        tempFormData.set(userId, dataPage1);

        // ส่งปุ่มให้กรอกต่อหน้า 2
        const btnNext = new ButtonBuilder()
          .setCustomId("open_form_page2")
          .setLabel("กรอกฟอร์มหน้าที่ 2")
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(btnNext);

        await interaction.reply({ content: "โปรดกรอกข้อมูลในหน้าที่ 2", components: [row], ephemeral: true });
      } else if (interaction.customId === "ic_form_page2") {
        // รับข้อมูลหน้า 2
        const userId = interaction.user.id;
        const dataPage1 = tempFormData.get(userId);

        if (!dataPage1) {
          await interaction.reply({ content: "❌ ไม่พบข้อมูลหน้า 1 กรุณากรอกฟอร์มใหม่", ephemeral: true });
          return;
        }

        const dataPage2 = {
  dislike: interaction.fields.getTextInputValue("ic_dislike"),
  history: interaction.fields.getTextInputValue("ic_history"),
  want_role: interaction.fields.getTextInputValue("ic_want_role"),
  places: interaction.fields.getTextInputValue("ic_places"),
};


        // รวมข้อมูลทั้งสองหน้า
        const finalData = { ...dataPage1, ...dataPage2 };

        // โหลด channelId จาก Firestore
        const serverId = interaction.guild.id;
        const doc = await db.collection("formChannels").doc(serverId).get();
        if (!doc.exists) {
          await interaction.reply({ content: "❌ ไม่พบช่องที่จะส่งข้อมูล กรุณาใช้คำสั่ง `!form <channelId>` ก่อน", ephemeral: true });
          return;
        }
        const { channelId } = doc.data();
        const targetChannel = interaction.guild.channels.cache.get(channelId);
        if (!targetChannel) {
          await interaction.reply({ content: "❌ ไม่พบห้องเป้าหมาย", ephemeral: true });
          return;
        }

        const description = `
 **ชื่อ** : ${finalData.name}
 **อายุ** : ${finalData.age}
 **เพศ** : ${finalData.gender}
 **นิสัย** : ${finalData.trait}
 **ของที่ชอบ** : ${finalData.like}
 **ของที่ไม่ชอบ** : ${finalData.dislike}
 **ประวัติ** : ${finalData.history}
 **อยากโรลเป็นอะไร** : ${finalData.want_role}
 **เล่นอยู่กี่ที่** : ${finalData.places}
`;

const embed = new EmbedBuilder()
  .setTitle(`ข้อมูลของคุณ ${finalData.name}`)
  .setDescription(description)
  .setColor(0x9b59b6)
  .setFooter({ text: "Make by Purple Shop" });

await targetChannel.send({ content: `ฟอร์มของ <@${userId}>`, embeds: [embed] });



        await interaction.reply({ content: "กรอกฟอร์มสำเร็จ", ephemeral: true });

        // ลบข้อมูลชั่วคราวหลังส่งเสร็จ
        tempFormData.delete(userId);
      }
    }
  });
};
