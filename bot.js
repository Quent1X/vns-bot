require('dotenv').config();
const { Client } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: ['Guilds'] });

// Fonction pour obtenir un token Twitch
async function getTwitchToken() {
  console.log("🔑 Demande d'un nouveau token Twitch...");
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  const data = await response.json();
  return data.access_token;
}

client.once('ready', async () => {
  console.log(`🤖 Bot Discord connecté en tant que ${client.user.tag}`);
  
  // Test de connexion à Twitch
  try {
    const token = await getTwitchToken();
    console.log("✅ Connexion Twitch réussie !");
    console.log("Token temporaire (ne pas partager) :", token.slice(0, 10) + "...");
  } catch (error) {
    console.error("❌ Erreur Twitch :", error);
  }
});

client.login(process.env.TOKEN); // Utilise le token Discord de votre .env