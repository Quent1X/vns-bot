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
  const db = await pool.connect();

  try {
    const res = await db.query('SELECT * FROM streamers WHERE active = true');
    const streamers = res.rows;

    if (streamers.length === 0) return;

    const usernames = streamers.map(s => s.username);
    const url = `https://api.twitch.tv/helix/streams?user_login=${usernames.join('&user_login=')}`;

    const token = await getTwitchToken();
    if (!token) return;

    const response = await fetch(url, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!data?.data) return;

    const channel = client.channels.cache.get(notifyChannelId);
    if (!channel) return;

    for (const stream of data.data) {
      const check = await db.query('SELECT * FROM notified WHERE twitch_id = $1', [stream.id]);
      if (check.rowCount > 0) continue; // déjà notifié

      // envoyer la notif
      const embed = {
        title: `🔴 ${stream.user_name} est en live !`,
        url: `https://twitch.tv/${stream.user_login}`,
        description: `🎮 ${stream.game_name} | ${stream.title}`,
        image: { url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-440x248.jpg` },
        color: 0x9146FF
      };

      await channel.send({ content: `<@&${roleId}>`, embeds: [embed] });

      await db.query('INSERT INTO notified (twitch_id, started_at) VALUES ($1, NOW())', [stream.id]);
    }
  } catch (err) {
    console.error('❌ Erreur Twitch Live:', err);
  } finally {
    db.release();
  }
}

module.exports = { checkTwitchLive };
