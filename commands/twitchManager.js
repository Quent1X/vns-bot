const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

const STAFF_ROLE_ID = '1364697720127754302';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
        .setDescription('Désactiver un streamer Twitch')
        .addUserOption(opt =>
          opt.setName('utilisateur').setDescription('Membre à désactiver').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lister tous les streamers enregistrés')
    ),

  async execute(interaction) {
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    if (!isStaff) {
      return interaction.reply({ content: "❌ Seul le staff peut utiliser cette commande.", flags: 1 << 6 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('utilisateur');
      const twitchUsername = interaction.options.getString('pseudo').toLowerCase();

      if (!/^[a-zA-Z0-9_]{3,25}$/.test(twitchUsername)) {
        return interaction.reply({ content: "❌ Pseudo Twitch invalide.", flags: 1 << 6 });
      }

      const client = await pool.connect();
      try {
        const check = await client.query('SELECT * FROM streamers WHERE discord_id = $1', [user.id]);
        if (check.rowCount > 0) {
          return interaction.reply({ content: "⚠️ Ce membre est déjà enregistré.", flags: 1 << 6 });
        }

        await client.query('INSERT INTO streamers (discord_id, username, active) VALUES ($1, $2, true)', [user.id, twitchUsername]);
        return interaction.reply({ content: `✅ ${user} a été ajouté comme **${twitchUsername}**` });
      } finally {
        client.release();
      }
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('utilisateur');
      const client = await pool.connect();

      try {
        const res = await client.query('UPDATE streamers SET active = false WHERE discord_id = $1 RETURNING *', [user.id]);
        if (res.rowCount === 0) {
          return interaction.reply({ content: "❌ Ce membre n’est pas dans la liste.", flags: 1 << 6 });
        }

        return interaction.reply({ content: `🗑️ ${user} a été désactivé.` });
      } finally {
        client.release();
      }
    }

    if (sub === 'list') {
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT * FROM streamers');
        if (res.rowCount === 0) {
          return interaction.reply({ content: "📭 Aucun streamer Twitch enregistré.", flags: 1 << 6 });
        }

        const listEmbed = new EmbedBuilder()
          .setTitle("📺 Liste des streamers Twitch")
          .setColor(0x9146FF)
          .setDescription(
            res.rows.map(s => {
              const status = s.active === false ? '🔕 inactif' : '✅ actif';
              const userDisplay = s.discord_id ? `<@${s.discord_id}>` : '`inconnu`';
              return `• ${userDisplay} → **${s.username}** (${status})`;
            }).join('\n')
          );

        return interaction.reply({ embeds: [listEmbed] });
      } finally {
        client.release();
      }
    }
  }
};
