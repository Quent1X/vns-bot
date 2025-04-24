const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config(); // ← Important ici aussi

let cachedToken = null;
let expiresAt = 0;

async function getTwitchToken() {
  const now = Date.now();
  if (cachedToken && now < expiresAt) return cachedToken;

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });

  const data = await res.json();

  if (data.access_token) {
    cachedToken = data.access_token;
    expiresAt = now + (data.expires_in * 1000) - 60000;
    return cachedToken;
  } else {
    console.error("❌ Erreur token Twitch :", data);
    return null;
  }
}

module.exports = { getTwitchToken };
