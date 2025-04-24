require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require('discord.js');

// === Configuration ===
const WELCOME_CHANNEL_ID = '1364697720874602668'; // Canal de bienvenue
const RULES_CHANNEL_ID = '1364866891381997650'; // Canal du règlement
const ROLE_ID = '1364718859822829641'; // Rôle à donner

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);

  const channel = client.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) return console.error("❌ Canal de règlement introuvable");

  // Ne republie pas si le règlement est déjà présent
  const messages = await channel.messages.fetch({ limit: 10 });
  const alreadyPosted = messages.some(msg => msg.author.id === client.user.id && msg.embeds.length);

  if (!alreadyPosted) {
    const embed = new EmbedBuilder()
      .setTitle('📜 RÈGLEMENT DU SERVEUR VNS')
      .setDescription(
        `Bienvenue à toi chez **VNS** — la communauté qui ne tue pas les squads adverses mais les ridiculise !\n\n` +
        `Merci de prendre quelques minutes pour lire ce règlement, on tient à une bonne ambiance 😌\n\n` +
        `🔹 **1. Respect avant tout**\n` +
        `→ On est ici pour chill. Aucune place pour les insultes, propos haineux ou discriminations.\n\n` +
        `🔹 **2. Pas de spam, pub ou contenu NSFW**\n` +
        `→ On rigole, mais dans les limites du bon goût.\n\n` +
        `🔹 **3. Utilise les bons canaux**\n` +
        `→ Chaque salon a sa fonction, respecte-les pour qu’on s’y retrouve.\n\n` +
        `🔹 **4. Pas de pseudo troll ou illisible**\n` +
        `→ On doit pouvoir te tagger facilement 🧠\n\n` +
        `🔹 **5. Le staff est là pour vous, mais restez cool**\n` +
        `→ On est bénévoles. Une remarque ? On en discute sans clash.\n\n` +
        `✅ Clique sur le bouton ci-dessous pour **valider** et accéder au serveur.`
      )
      .setColor(0x00AEEF)
      .setFooter({ text: 'L’équipe VNS vous souhaite la bienvenue 💜' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_rules')
        .setLabel('✅ Je valide')
        .setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log("📜 Règlement VNS envoyé avec bouton.");
  }
});

// 🎉 Message de bienvenue
client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🎉 Bienvenue chez VNS !')
    .setDescription(`Salut ${member}, installe-toi confortablement !\nVa lire le <#${RULES_CHANNEL_ID}> pour débloquer l’accès.`)
    .setColor(0x00FF00)
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `Nous sommes maintenant ${member.guild.memberCount} membres.` });

  channel.send({ embeds: [embed] });
});

// 👋 Message de départ
client.on('guildMemberRemove', member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('😢 Départ...')
    .setDescription(`${member.user.tag} a quitté le serveur.`)
    .setColor(0xFF0000)
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `Il reste ${member.guild.memberCount} membres.` });

  channel.send({ embeds: [embed] });
});

// 🔘 Gestion du bouton "Je valide"
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'accept_rules') return;

  const role = interaction.guild.roles.cache.get(ROLE_ID);
  if (!role) return interaction.reply({ content: "❌ Rôle introuvable.", ephemeral: true });

  try {
    await interaction.member.roles.add(role);
    await interaction.reply({ content: "✅ Tu as bien accepté le règlement. Bienvenue chez VNS !", ephemeral: true });
    console.log(`🎁 ${interaction.member.user.tag} a reçu le rôle VNS.`);
  } catch (err) {
    console.error("❌ Problème lors de l'attribution du rôle :", err);
    await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
