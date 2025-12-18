require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commandsDir = path.join(__dirname, "commands");
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".js"));

const commands = files
  .map(f => require(path.join(commandsDir, f)))
  .filter(c => c?.data?.toJSON)
  .map(c => c.data.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  console.log(`📤 Registrando ${commands.length} comando(s)...`);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Registrado!");
})();
