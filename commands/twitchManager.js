const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const STREAMERS_FILE = path.join(__dirname, '../streamers.json');
const STAFF_ROLE_ID = '1364697720127754302';
const COMMAND_LOG_CHANNEL = '1364954060570103868';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Gérer les streamers Twitch')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Associer un membre à son pseudo Twitch')
        .addUserOption(opt =>
          opt.setName('utilisateur').setDescription('Membre à associer').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('pseudo').setDescription('Pseudo Twitch').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Désactiver un streamer Twitch (soft delete)')
        .addUserOption(opt =>
          opt.setName('utilisateur').setDescription('Membre à désactiver').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lister tous les streamers Twitch enregistrés')
    ),

  async execute(interaction) {
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    if (!isStaff) {
      return interaction.reply({ content: "❌ Seul le staff peut utiliser cette commande.", flags: 1 << 6 });
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
        return interaction.reply({ content: "❌ Pseudo Twitch invalide.", flags: 1 << 6 });
      }

      if (data.streamers.find(s => s.discordId === user.id)) {
        return interaction.reply({ content: "⚠️ Ce membre est déjà enregistré.", flags: 1 << 6 });
      }

      data.streamers.push({ discordId: user.id, username: twitchUsername, active: true });
      fs.writeFileSync(STREAMERS_FILE, JSON.stringify(data, null, 2));

      return interaction.reply({ content: `✅ ${user} a été ajouté comme **${twitchUsername}**` });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('utilisateur');
      const streamer = data.streamers.find(s => s.discordId === user.id);

      if (!streamer) {
        return interaction.reply({ content: "❌ Ce membre n’est pas dans la liste.", flags: 1 << 6 });
      }

      streamer.active = false;
      fs.writeFileSync(STREAMERS_FILE, JSON.stringify(data, null, 2));
      return interaction.reply({ content: `🗑️ ${user} a été désactivé.` });
    }

    if (sub === 'list') {
      if (data.streamers.length === 0) {
        return interaction.reply({ content: "📭 Aucun streamer Twitch enregistré.", flags: 1 << 6 });
      }

      const listEmbed = new EmbedBuilder()
        .setTitle("📺 Liste des streamers Twitch")
        .setColor(0x9146FF)
        .setDescription(
          data.streamers.map(s => {
            const status = s.active === false ? '🔕 inactif' : '✅ actif';
            const userDisplay = s.discordId ? `<@${s.discordId}>` : '`inconnu`';
            return `• ${userDisplay} → **${s.username}** (${status})`;
          }).join('\n')
        );

      return interaction.reply({ embeds: [listEmbed] });
    }
  }
};
