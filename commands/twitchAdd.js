const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const STREAMERS_FILE = path.join(__dirname, '../streamers.json');
const STAFF_ROLE_ID = '1364697720127754302';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Gérer les streamers Twitch')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Associer un membre à son pseudo Twitch')
        .addUserOption(opt =>
          opt.setName('utilisateur')
            .setDescription('Membre à associer')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('pseudo')
            .setDescription('Pseudo Twitch')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: "❌ Seul le staff peut utiliser cette commande.", ephemeral: true });
    }

    const user = interaction.options.getUser('utilisateur');
    const twitchUsername = interaction.options.getString('pseudo').toLowerCase();

    if (!twitchUsername.match(/^[a-zA-Z0-9_]{3,25}$/)) {
      return interaction.reply({ content: "❌ Pseudo Twitch invalide.", ephemeral: true });
    }

    let data = { streamers: [] };
    if (fs.existsSync(STREAMERS_FILE)) {
      data = JSON.parse(fs.readFileSync(STREAMERS_FILE, 'utf8'));
    }

    if (data.streamers.find(s => s.discordId === user.id)) {
      return interaction.reply({ content: "⚠️ Ce membre est déjà enregistré.", ephemeral: true });
    }

    data.streamers.push({ discordId: user.id, username: twitchUsername });
    fs.writeFileSync(STREAMERS_FILE, JSON.stringify(data, null, 2));

    await interaction.reply({
      content: `✅ ${user} a bien été enregistré comme **${twitchUsername}** sur Twitch.`,
      ephemeral: false
    });
  }
};
