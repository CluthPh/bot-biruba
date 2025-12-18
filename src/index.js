// src/index.js
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

// ===== ENV =====
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN não encontrado. Coloque TOKEN=... no .env");
  process.exit(1);
}

// ===== CLIENT (SEM INTENTS PRIVILEGIADAS) =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ✅ garante que client.commands sempre existe
client.commands = new Collection();

// ===== HELPERS =====
function listJsFiles(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".js"))
      .map((d) => d.name);
  } catch (e) {
    console.warn(`⚠️ Não consegui ler pasta: ${dir}`, e?.message || e);
    return [];
  }
}

function safeRequire(absPath) {
  try {
    const mod = require(absPath);
    return mod?.default ?? mod;
  } catch (e) {
    console.warn(`⚠️ Falha ao importar: ${absPath}\n   ${e?.message || e}`);
    return null;
  }
}

// ===== LOAD COMMANDS =====
const commandsDir = path.join(__dirname, "commands");
for (const file of listJsFiles(commandsDir)) {
  const abs = path.join(commandsDir, file);
  const command = safeRequire(abs);

  // aceita:
  // { data: SlashCommandBuilder, execute() }
  // ou { name: "x", execute() }
  const name = command?.data?.name || command?.name;
  const execute = command?.execute || command?.run;

  if (!name || typeof execute !== "function") {
    console.warn(`⚠️ Comando inválido: ${file} (precisa { data/name, execute })`);
    continue;
  }

  client.commands.set(name, command);
  console.log(`✅ Comando carregado: ${name} (${file})`);
}

// ===== LOAD EVENTS =====
const eventsDir = path.join(__dirname, "events");
for (const file of listJsFiles(eventsDir)) {
  const abs = path.join(eventsDir, file);
  const event = safeRequire(abs);

  // espera:
  // { name: "ready", once: true, execute(...) }
  const eventName = event?.name;
  const once = Boolean(event?.once);
  const execute = event?.execute;

  if (!eventName || typeof execute !== "function") {
    console.warn(`⚠️ Evento inválido: ${file} (precisa { name, execute })`);
    continue;
  }

  if (once) client.once(eventName, (...args) => execute(...args, client));
  else client.on(eventName, (...args) => execute(...args, client));

  console.log(`✅ Evento carregado: ${eventName} (${file})`);
}

// ===== FALLBACK: interactionCreate (caso não exista arquivo de evento) =====
if (!client.listenerCount("interactionCreate")) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const exec = command.execute || command.run;

    try {
      await exec(interaction, client);
    } catch (err) {
      console.error(`❌ Erro no comando ${interaction.commandName}:`, err);

      const msg = "Deu erro ao executar esse comando.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  });
}

// ===== READY (sempre imprime sem quebrar) =====
client.once("ready", () => {
  console.log(`🤖 Online como ${client.user.tag}`);
  console.log(`📦 Comandos carregados: ${client.commands?.size ?? 0}`);
});

// ===== START =====
client.login(TOKEN).catch((e) => {
  console.error("❌ Falha ao logar. Token inválido ou sem permissão.", e?.message || e);
  process.exit(1);
});
