require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const races = require('./races.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


function getNextRace() {
  const now = moment();
  for (const race of races) {
    const sessions = Object.values(race.sessions).map(t => moment(t));
    if (sessions.some(s => s.isAfter(now))) return race;
  }
  return null;
}


function buildRaceEmbed(race, userTz) {
  const embed = new EmbedBuilder()
    .setTitle(`🏁 ${race.name} - ${race.track}`)
    .setColor('#FF0000')
    .setFooter({ text: 'MotoGP 2025 Schedule' });

  for (const [session, time] of Object.entries(race.sessions)) {
    const sessionTime = moment(time).tz(userTz);
    const now = moment().tz(userTz);
    const diff = sessionTime.diff(now);
    const countdown = diff > 0
      ? `${Math.floor(diff / (1000 * 60 * 60 * 24))}d ${Math.floor((diff / (1000 * 60 * 60)) % 24)}h ${Math.floor((diff / (1000 * 60)) % 60)}m`
      : '✅ Finished';

  
    let emoji = '';
    switch(session.toLowerCase()) {
      case 'free practice 1': emoji = '🟢'; break;
      case 'practice': emoji = '🟢'; break;
      case 'free practice 2': emoji = '🟢'; break;
      case 'qualifying 1': emoji = '🏎️'; break;
      case 'qualifying 2': emoji = '🏎️'; break;
      case 'sprint': emoji = '⚡'; break;
      case 'warm up': emoji = '☀️'; break;
      case 'race': emoji = '🏁'; break;
      default: emoji = '📌';
    }

    embed.addFields({
      name: `${emoji} ${session}`,
      value: `${sessionTime.format('ddd, MMM D, HH:mm z')} | ⏱ ${countdown}`,
      inline: false
    });
  }

  return embed;
}


const commands = [
  new SlashCommandBuilder()
    .setName('nextweekend')
    .setDescription('Shows the full schedule of the next MotoGP weekend in your local time'),
  new SlashCommandBuilder()
    .setName('support')
    .setDescription('Support the developer')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🚀 Registering commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Commands registered!');
  } catch (error) {
    console.error(error);
  }
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const userTz = moment.tz.guess(); 

  if (commandName === 'nextweekend') {
    const nextRace = getNextRace();
    if (!nextRace) return interaction.reply('🎉 No upcoming races!');

    const embed = buildRaceEmbed(nextRace, userTz);
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'support') {
    await interaction.reply('☕ Support the developer:\n[Buy me a coffee](https://buymeacoffee.com/pramu.cc)\n🌐 Website: [vishwapramuditha.com](https://vishwapramuditha.com)');
  }
});

client.login(process.env.TOKEN);
