const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

const STAFF_ROLE_ID = '1364697720127754302';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
    )
    .addSubcommand(sub =>
        sub.setName('activate')
          .setDescription('Réactiver un streamer Twitch désactivé')
          .addUserOption(opt =>
            opt.setName('utilisateur').setDescription('Membre à réactiver').setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub.setName('delete')
          .setDescription('Supprimer complètement un streamer Twitch de la base')
          .addUserOption(opt =>
            opt.setName('utilisateur').setDescription('Membre à supprimer').setRequired(true)
          )
      ),
      

  async execute(interaction) {
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    if (!isStaff) {
      return interaction.reply({ content: "❌ Seul le staff peut utiliser cette commande.", flags: 1 << 6 });
    }

    const sub = interaction.options.getSubcommand();
    const client = await pool.connect();

    try {
      if (sub === 'add') {
        const user = interaction.options.getUser('utilisateur');
        const twitchUsername = interaction.options.getString('pseudo').toLowerCase();

        if (!/^[a-zA-Z0-9_]{3,25}$/.test(twitchUsername)) {
          return interaction.reply({ content: "❌ Pseudo Twitch invalide.", flags: 1 << 6 });
        }

        const res = await client.query('SELECT * FROM streamers WHERE discord_id = $1', [user.id]);
        if (res.rowCount > 0) {
          return interaction.reply({ content: "⚠️ Ce membre est déjà enregistré.", flags: 1 << 6 });
        }

        await client.query(
          'INSERT INTO streamers (discord_id, username, active) VALUES ($1, $2, true)',
          [user.id, twitchUsername]
        );

        return interaction.reply({ content: `✅ ${user} a été ajouté comme **${twitchUsername}**` });
      }

      if (sub === 'remove') {
        const user = interaction.options.getUser('utilisateur');

        const res = await client.query(
          'UPDATE streamers SET active = false WHERE discord_id = $1 RETURNING *',
          [user.id]
        );

        if (res.rowCount === 0) {
          return interaction.reply({ content: "❌ Ce membre n’est pas dans la liste.", flags: 1 << 6 });
        }

        return interaction.reply({ content: `🗑️ ${user} a été désactivé.` });
      }

      if (sub === 'list') {
        const res = await client.query('SELECT * FROM streamers');

        if (res.rowCount === 0) {
          return interaction.reply({ content: "📭 Aucun streamer Twitch enregistré.", flags: 1 << 6 });
        }

        const embed = new EmbedBuilder()
          .setTitle("📺 Liste des streamers Twitch")
          .setColor(0x9146FF)
          .setDescription(
            res.rows.map(s => {
              const status = s.active === false ? '🔕 inactif' : '✅ actif';
              return `• <@${s.discord_id}> → **${s.username}** (${status})`;
            }).join('\n')
          );

        return interaction.reply({ embeds: [embed] });
      }
      if (sub === 'activate') {
        const user = interaction.options.getUser('utilisateur');
        const res = await client.query(
          'UPDATE streamers SET active = true WHERE discord_id = $1 RETURNING *',
          [user.id]
        );
      
        if (res.rowCount === 0) {
          return interaction.reply({ content: "❌ Ce membre n’est pas dans la base.", flags: 1 << 6 });
        }
      
        return interaction.reply({ content: `✅ ${user} a été réactivé.` });
      }
      
      if (sub === 'delete') {
        const user = interaction.options.getUser('utilisateur');
        const res = await client.query(
          'DELETE FROM streamers WHERE discord_id = $1 RETURNING *',
          [user.id]
        );
      
        if (res.rowCount === 0) {
          return interaction.reply({ content: "❌ Ce membre n’existe pas dans la base.", flags: 1 << 6 });
        }
      
        return interaction.reply({ content: `🗑️ ${user} a été supprimé de la base.` });
      }
      
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Une erreur est survenue.", flags: 1 << 6 });
    } finally {
      client.release();
    }
  }
};
