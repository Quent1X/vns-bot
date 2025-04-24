const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { Pool } = require('pg');
const { getTwitchToken } = require('./getTwitchToken');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;

async function checkTwitchLive(client, notifyChannelId, roleId) {
  console.log("🔁 [TwitchChecker] Début du check...");

  const db = await pool.connect();
  try {
    // Purge des anciennes notifications (streams plus vieux que 2h)
    console.log("🧹 Purge des anciennes entrées de notified...");

    const res = await db.query('SELECT * FROM streamers WHERE active = true');
    const streamers = res.rows;

    if (streamers.length === 0) {
      console.log("📭 Aucun streamer actif trouvé.");
      return;
    }

    const usernames = streamers.map(s => s.username);
    const url = `https://api.twitch.tv/helix/streams?user_login=${usernames.join('&user_login=')}`;

    const token = await getTwitchToken();
    if (!token) {
      console.error("❌ Token Twitch invalide ou non récupéré.");
      return;
    }

    const response = await fetch(url, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!data?.data) {
      console.log("📭 Aucun stream actif détecté.");
      return;
    }

    const channel = client.channels.cache.get(notifyChannelId);
    if (!channel) {
      console.warn("❌ Canal de notification introuvable.");
      return;
    }

    for (const stream of data.data) {
        const check = await db.query(
            `SELECT * FROM notified WHERE twitch_id = $1 AND started_at > NOW() - INTERVAL '2 hours'`,
            [stream.id]
          );
          if (check.rowCount > 0) continue; // déjà notifié récemment


      // Envoi de la notification
      const embed = {
        author: {
          name: `${stream.user_name} est en live sur Twitch !`,
          icon_url: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
          url: `https://twitch.tv/${stream.user_login}`
        },
        title: stream.title || '🔴 Live en cours',
        description: `🔔 [Rejoindre le live](https://twitch.tv/${stream.user_login})`,
        fields: [
          {
            name: '🎮 Jeu',
            value: stream.game_name || 'Inconnu',
            inline: true
          },
          {
            name: '👥 Viewers',
            value: `${stream.viewer_count}`,
            inline: true
          }
        ],
        thumbnail: {
          url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-320x180.jpg`
        },
        footer: {
          text: `🔴 En live depuis ${new Date(stream.started_at).toLocaleTimeString('fr-FR')} • Aujourd’hui à ${new Date().toLocaleTimeString('fr-FR')}`
        },
        timestamp: new Date().toISOString(),
        color: 0x9146FF
      };
      
      

      await channel.send({ content: `<@&${roleId}>`, embeds: [embed] });
      console.log(`📢 Notification envoyée pour ${stream.user_name}`);

      await db.query('INSERT INTO notified (twitch_id, started_at) VALUES ($1, NOW())', [stream.id]);
    }

  } catch (err) {
    console.error('❌ Erreur Twitch Live:', err);
  } finally {
    db.release();
  }
}

module.exports = { checkTwitchLive };
