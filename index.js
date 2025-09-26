require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
} = require("discord.js");
const moment = require("moment-timezone");
const races = require("./races.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ------------------- Bot Ready -------------------
client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ------------------- Helper Functions -------------------
function getNextRace() {
  const now = moment();
  return (
    races.find((race) =>
      Object.values(race.sessions).some((t) =>
        moment.tz(t, "YYYY-MM-DD HH:mm", "Asia/Colombo").isAfter(now),
      ),
    ) || null
  );
}

// ------------------- Slash Commands -------------------
const commands = [
  new SlashCommandBuilder()
    .setName("next")
    .setDescription(
      "Shows the full schedule of the next MotoGP weekend in your local time",
    ),
  new SlashCommandBuilder()
    .setName("support")
    .setDescription("Support the developer"),
].map((cmd) => cmd.toJSON());

// ------------------- Register Commands -------------------
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log("🚀 Registering commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Commands registered!");
  } catch (error) {
    console.error(error);
  }
})();

// ------------------- Command Handling -------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "next") {
    const nextRace = getNextRace();
    if (!nextRace) return interaction.reply("🎉 No upcoming races!");

    const embed = new EmbedBuilder()
      .setTitle(`🏁 ${nextRace.name} - ${nextRace.track}`)
      .setColor("#FF0000")
      .setFooter({ text: "MotoGP 2025 Schedule" });

    for (const [session, time] of Object.entries(nextRace.sessions)) {
      const sessionTime = moment.tz(time, "YYYY-MM-DD HH:mm", "Asia/Colombo");

      // Emoji for session
      let emoji = "📌";
      switch (session.toLowerCase()) {
        case "free practice 1":
        case "practice":
        case "free practice 2":
          emoji = "🟢";
          break;
        case "qualifying 1":
        case "qualifying 2":
          emoji = "🏎️";
          break;
        case "sprint":
          emoji = "⚡";
          break;
        case "warm up":
          emoji = "☀️";
          break;
        case "race":
          emoji = "🏁";
          break;
      }

      // Discord timestamp for user local time
      const unixTime = Math.floor(sessionTime.valueOf() / 1000);
      const displayTime = `<t:${unixTime}:f>`;

      // Countdown
      const now = moment();
      const diff = sessionTime.diff(now);
      const countdown =
        diff > 0
          ? `${Math.floor(diff / (1000 * 60 * 60 * 24))}d ${Math.floor((diff / (1000 * 60 * 60)) % 24)}h ${Math.floor((diff / (1000 * 60)) % 60)}m`
          : "✅";

      embed.addFields({
        name: `${emoji} ${session}`,
        value: `${displayTime} | ⏱ ${countdown}`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "support") {
    await interaction.reply({
      content:
        "☕ Support the developer:\n[Buy me a coffee](https://buymeacoffee.com/pramu.cc)\n🌐 Website: [vishwapramuditha.com](https://vishwapramuditha.com)",
      ephemeral: true,
    });
  }
});
client.login(process.env.TOKEN);
