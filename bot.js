require('dotenv').config();
const { Client } = require('discord.js');
const fetch = require('node-fetch'); // Ajout de cette ligne

const client = new Client({ intents: ['Guilds'] });

// Fonction pour obtenir un token Twitch
async function getTwitchToken() {
  console.log("🔑 Demande d'un nouveau token Twitch...");
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`);
  }
  
  return await response.json();
}

client.once('ready', async () => {
  console.log(`🤖 Bot Discord connecté en tant que ${client.user.tag}`);
  
  try {
    const tokenData = await getTwitchToken();
    console.log("✅ Connexion Twitch réussie !");
    console.log("Token expirera dans", tokenData.expires_in, "secondes");
    console.log("Token (début):", tokenData.access_token.substring(0, 10) + "...");
  } catch (error) {
    console.error("❌ Erreur Twitch :", error.message);
  }
});

client.login(process.env.TOKEN);