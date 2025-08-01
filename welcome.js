const { EmbedBuilder } = require("discord.js");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = (client) => {
  // รายชื่อ user ที่อนุญาตใช้คำสั่ง !welcome
  const allowedUsers = [
    "849964668177088562",
    "571999000237178881",
    "1010202066720936048"
  ];

  // คำสั่ง !welcome
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.trim() !== "!welcome") return;

    // เช็คสิทธิ์ user
    if (!allowedUsers.includes(message.author.id)) {
      await message.channel.send("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้");
      return;
    }

    try {
      // ลบข้อความคำสั่งทิ้ง
      await message.delete().catch(() => {});

      // บันทึก channelId ลง Firebase
      await db.collection("welcomeChannels").doc(message.guild.id).set({
        channelId: message.channel.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // แจ้ง Setup เรียบร้อย
      await message.channel.send("✅ Setup เรียบร้อย");

    } catch (e) {
      console.error("❌ เกิดข้อผิดพลาดในการตั้งค่า welcome channel:", e);
      await message.channel.send("❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  });

  // ฟัง event คนเข้าร่วมเซิร์ฟเวอร์
  client.on("guildMemberAdd", async (member) => {
    try {
      // ดึง channelId จาก Firebase
      const doc = await db.collection("welcomeChannels").doc(member.guild.id).get();
      if (!doc.exists) return; // ถ้าไม่เคยตั้งค่า channel ต้อนรับ

      const channelId = doc.data().channelId;
      const channel = member.guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return;

      // สร้าง embed แจ้งต้อนรับ
      const embed = new EmbedBuilder()
        .setTitle("𝒘𝒆𝒍𝒄𝒐𝒎𝒆")
        .setDescription(`𝒘𝒆𝒍𝒄𝒐𝒎𝒆 <@${member.id}>\n 𝒕𝒐 **${member.guild.name}\n\nขอให้มีความทรงจำดีๆกับโรลนี้น้าา**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(0x9b59b6)
        .setImage("https://i.pinimg.com/originals/b3/4b/d0/b34bd0ef85660338e6082332e0d31a7f.gif")
        .setFooter({ text: "Make by Purple Shop" })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (e) {
      console.error("❌ เกิดข้อผิดพลาดในการส่งข้อความต้อนรับ:", e);
    }
  });
};
