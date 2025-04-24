require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { Pool } = require('pg');
const { getTwitchToken } = require('./getTwitchToken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;

async function checkTwitchLive(client, notifyChannelId, roleId) {
  console.log("🔁 [TwitchChecker] Début du check...");

  const db = await pool.connect();

  try {
    const res = await db.query('SELECT * FROM streamers WHERE active = true');
    const streamers = res.rows;

    if (streamers.length === 0) {
      console.log("❌ Aucun streamer actif dans la base.");
      return;
    }

    const usernames = streamers.map(s => s.username);
    const url = `https://api.twitch.tv/helix/streams?user_login=${usernames.join('&user_login=')}`;
    const token = await getTwitchToken();

    if (!token) {
      console.log("❌ Token Twitch invalide ou non récupéré.");
      return;
    }

    const response = await fetch(url, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log("📦 Réponse Twitch API:", JSON.stringify(data, null, 2));

    if (!data?.data || data.data.length === 0) {
      console.log("⚠️ Aucun live détecté.");
      return;
    }

    const channel = client.channels.cache.get(notifyChannelId);
    if (!channel) {
      console.log("❌ Salon de notification introuvable.");
      return;
    }

    for (const stream of data.data) {
      const twitchId = stream.id;
      const alreadyNotified = await db.query('SELECT * FROM notified WHERE twitch_id = $1', [twitchId]);

      if (alreadyNotified.rowCount > 0) {
        console.log(`🔁 Déjà notifié : ${stream.user_name} (${twitchId})`);
        continue;
      }

      console.log(`📣 Nouvelle notif envoyée pour ${stream.user_name}`);

      const embed = {
        title: `🔴 ${stream.user_name} est en live !`,
        url: `https://twitch.tv/${stream.user_login}`,
        description: `🎮 ${stream.game_name} | ${stream.title}`,
        image: { url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-440x248.jpg` },
        color: 0x9146FF
      };

      await channel.send({ content: `<@&${roleId}>`, embeds: [embed] });

      await db.query('INSERT INTO notified (twitch_id, started_at) VALUES ($1, NOW())', [twitchId]);
    }

  } catch (err) {
    console.error("❌ Erreur check Twitch:", err);
  } finally {
    db.release();
  }
}

module.exports = { checkTwitchLive };
