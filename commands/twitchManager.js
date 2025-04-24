const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Supprimer un streamer Twitch')
        .addUserOption(opt =>
          opt.setName('utilisateur')
            .setDescription('Membre à retirer')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lister tous les streamers Twitch enregistrés')
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: "❌ Seul le staff peut utiliser cette commande.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    let data = { streamers: [] };
    if (fs.existsSync(STREAMERS_FILE)) {
      data = JSON.parse(fs.readFileSync(STREAMERS_FILE, 'utf8'));
    }

    if (sub === 'add') {
      const user = interaction.options.getUser('utilisateur');
      const twitchUsername = interaction.options.getString('pseudo').toLowerCase();

      if (!twitchUsername.match(/^[a-zA-Z0-9_]{3,25}$/)) {
        return interaction.reply({ content: "❌ Pseudo Twitch invalide.", ephemeral: true });
      }

      if (data.streamers.find(s => s.discordId === user.id)) {
        return interaction.reply({ content: "⚠️ Ce membre est déjà enregistré.", ephemeral: true });
      }

      data.streamers.push({ discordId: user.id, username: twitchUsername });
      fs.writeFileSync(STREAMERS_FILE, JSON.stringify(data, null, 2));

      return interaction.reply({ content: `✅ ${user} ajouté comme **${twitchUsername}**`, ephemeral: false });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('utilisateur');
      const initialLength = data.streamers.length;
      data.streamers = data.streamers.filter(s => s.discordId !== user.id);

      if (data.streamers.length === initialLength) {
        return interaction.reply({ content: "❌ Ce membre n'était pas enregistré.", ephemeral: true });
      }

      fs.writeFileSync(STREAMERS_FILE, JSON.stringify(data, null, 2));
      return interaction.reply({ content: `🗑️ ${user} a été retiré des streamers Twitch.`, ephemeral: false });
    }

    if (sub === 'list') {
      if (data.streamers.length === 0) {
        return interaction.reply({ content: "📭 Aucun streamer Twitch enregistré pour le moment.", ephemeral: false });
      }

      const listEmbed = new EmbedBuilder()
        .setTitle("🎥 Liste des streamers Twitch")
        .setColor(0x9146FF)
        .setDescription(
          data.streamers.map(s => `- <@${s.discordId}> → **${s.username}**`).join('\n')
        );

      return interaction.reply({ embeds: [listEmbed] });
    }
  }
};
