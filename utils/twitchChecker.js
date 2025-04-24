require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const { getTwitchToken } = require('./getTwitchToken');

const STREAMERS_FILE = path.join(__dirname, '../streamers.json');
const NOTIFIED_FILE = path.join(__dirname, '../notifiedStreams.json');
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;

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

    // Lire ou initialiser la liste des streams notifiés
    let notified = [];
    if (fs.existsSync(NOTIFIED_FILE)) {
      try {
        const raw = fs.readFileSync(NOTIFIED_FILE, 'utf8');
        notified = JSON.parse(raw).streams || [];
      } catch (err) {
        console.warn("⚠️ Impossible de lire notifiedStreams.json, on repart de zéro.");
        notified = [];
      }
    }

    let updated = false;

    // Traitement des streams actifs
    data.data.forEach(stream => {
      const streamId = stream.id;

      if (notified.includes(streamId)) return; // déjà notifié

      // Envoi de la notif
      const embed = {
        title: `🔴 ${stream.user_name} est en live !`,
        url: `https://twitch.tv/${stream.user_login}`,
        description: `🎮 ${stream.game_name} | ${stream.title}`,
        image: { url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-440x248.jpg` },
        color: 0x9146FF
      };

      channel.send({ content: `<@&${roleId}>`, embeds: [embed] });

      notified.push(streamId);
      updated = true;
    });

    // Sauvegarde uniquement si on a notifié un nouveau stream
    if (updated) {
      fs.writeFileSync(NOTIFIED_FILE, JSON.stringify({ streams: notified }, null, 2));
    }

  } catch (err) {
    console.error("❌ Erreur lors de la récupération Twitch :", err);
  }
}

module.exports = { checkTwitchLive };
