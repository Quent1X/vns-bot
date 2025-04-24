const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

const STREAMERS_FILE = path.join(__dirname, '../streamers.json');
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const { getTwitchToken } = require('./getTwitchToken'); // Adapte le chemin si le fichier est ailleurs

async function checkTwitchLive(client, notifyChannelId, roleId) {
  if (!fs.existsSync(STREAMERS_FILE)) return;

  const { streamers } = JSON.parse(fs.readFileSync(STREAMERS_FILE, 'utf8'));
  const activeStreamers = streamers.filter(s => s.active !== false);
  if (activeStreamers.length === 0) return;

  const usernames = activeStreamers.map(s => s.username);
  const url = `https://api.twitch.tv/helix/streams?user_login=${usernames.join('&user_login=')}`;

  const token = await getTwitchToken();
  if (!token) return;

  try {
    const res = await fetch(url, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data || !data.data) {
      console.warn("⚠️ Aucune donnée renvoyée par Twitch:", data);
      return;
    }

    const channel = client.channels.cache.get(notifyChannelId);
    if (!channel) return;

    data.data.forEach(stream => {
      const embed = {
        title: `🔴 ${stream.user_name} est en live !`,
        url: `https://twitch.tv/${stream.user_login}`,
        description: `🎮 ${stream.game_name} | ${stream.title}`,
        image: { url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-440x248.jpg` },
        color: 0x9146FF
      };
      channel.send({ content: `<@&${roleId}>`, embeds: [embed] });
    });

  } catch (err) {
    console.error("❌ Erreur lors de la récupération Twitch :", err);
  }
}

module.exports = { checkTwitchLive };
