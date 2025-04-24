const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  REST,
  Routes,
  Collection
} = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const { checkTwitchLive } = require('./utils/twitchChecker');

// === Configuration ===
const WELCOME_CHANNEL_ID = '1364697720874602668';
const RULES_CHANNEL_ID = '1364866891381997650';
const ROLE_ID = '1364718859822829641';
const TWITCH_ROLE_ID = '1364945730372112496';
const ROLE_SELECTOR_CHANNEL = '1364946367939612683';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

// === Enregistrement des commandes slash ===
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);

  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Commandes slash enregistrées');
  } catch (err) {
    console.error('❌ Erreur enregistrement commandes :', err);
  }

  // === Message de règlement
  const rulesChannel = client.channels.cache.get(RULES_CHANNEL_ID);
  if (rulesChannel) {
    const messages = await rulesChannel.messages.fetch({ limit: 10 });
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
        new ButtonBuilder().setCustomId('accept_rules').setLabel('✅ Je valide').setStyle(ButtonStyle.Success)
      );

      await rulesChannel.send({ embeds: [embed], components: [row] });
      console.log("📜 Règlement VNS envoyé avec bouton.");
    }
    setInterval(() => {
      checkTwitchLive(client, '1364946098191470633', '1364945730372112496');
    }, 5 * 60 * 1000); // toutes les 5 minutes
    
  }

  // === Message pour rôle Twitch
  const PLATFORM_ROLES = [
    {
      id: 'twitch',
      name: 'Twitch',
      emoji: '🟣',
      roleId: '1364945730372112496',
      label: '🔔 Je veux les notifs Twitch',
      color: 0x9146FF,
      thumbnail: 'https://img.freepik.com/vecteurs-premium/logo-vectoriel-twitch-icone-vectorielle-twitch-logotype-icones-medias-sociaux_901408-472.jpg'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      emoji: '🔴',
      roleId: '1364957258215063584',
      label: '🔔 Je veux les notifs YouTube',
      color: 0xFF0000,
      thumbnail: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
    }
  ];
  
  const autoRoleChannel = client.channels.cache.get(ROLE_SELECTOR_CHANNEL);
  if (autoRoleChannel) {
    const messages = await autoRoleChannel.messages.fetch({ limit: 20 });
  
    for (const platform of PLATFORM_ROLES) {
      const alreadyPosted = messages.find(
        msg => msg.author.id === client.user.id &&
               msg.embeds[0]?.title?.includes(platform.name)
      );
      if (alreadyPosted) continue;
  
      const embed = new EmbedBuilder()
        .setTitle(`${platform.emoji} Choisis ton rôle ${platform.name}`)
        .setDescription(
          `📢 Tu veux recevoir les notifications de ${platform.name} ?\n\n` +
          `Clique ici pour activer ou désactiver le rôle <@&${platform.roleId}>.`
        )
        .setColor(platform.color)
        .setThumbnail(platform.thumbnail)
        .setFooter({ text: 'Sélection automatique de rôle - VNS' });
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`toggle_${platform.id}_role`)
          .setLabel(platform.label)
          .setStyle(ButtonStyle.Primary)
      );
  
      await autoRoleChannel.send({ embeds: [embed], components: [row] });
    }
  
    console.log("📩 Messages de sélection de rôles envoyés (si absents)");
  }  
  const COMMANDS_PANEL_CHANNEL = '1364954060570103868';

  const commandChannel = client.channels.cache.get(COMMANDS_PANEL_CHANNEL);
  if (commandChannel) {
    const messages = await commandChannel.messages.fetch({ limit: 10 });
    const alreadyPosted = messages.some(msg => msg.author.id === client.user.id && msg.embeds.length);

    if (!alreadyPosted) {
      const embed = new EmbedBuilder()
        .setTitle('🎛️ Panneau de gestion des streamers Twitch')
        .setDescription(
          `🧰 Utilisez les **commandes slash** ci-dessous pour gérer les streamers :\n\n` +
          `• \`/twitch add\` → Ajouter un streamer\n` +
          `• \`/twitch remove\` → Supprimer un streamer\n` +
          `• \`/twitch list\` → Voir la liste\n\n` +
          `👑 Réservé au rôle <@&1364697720127754302>`
        )
        .setColor(0x9146FF)
        .setFooter({ text: 'VNS • Gestion automatique' });

      await commandChannel.send({ embeds: [embed] });
      console.log("✅ Panneau Twitch posté dans #📟・commandes-vns");
    } else {
      console.log("📌 Le panneau Twitch est déjà présent dans #📟・commandes-vns");
    }
  }

  // 🔁 Twitch live checker
  setInterval(() => {
    checkTwitchLive(client, '1364946098191470633', '1364945730372112496');
  }, 5 * 60 * 1000);
});

// === Gestion des membres
client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🎉 Bienvenue chez VNS !')
    .setDescription(`Salut ${member}, va lire <#${RULES_CHANNEL_ID}> pour débloquer l’accès.`)
    .setColor(0x00FF00)
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `Nous sommes maintenant ${member.guild.memberCount} membres.` });

  channel.send({ embeds: [embed] });
});

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

// === Gestion des boutons et slash
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    const member = interaction.member;

    if (interaction.customId === 'accept_rules') {
      const role = member.guild.roles.cache.get(ROLE_ID);
      if (!role) return interaction.reply({ content: "❌ Rôle introuvable.", ephemeral: true });
      try {
        await member.roles.add(role);
        await interaction.reply({ content: "✅ Règlement accepté ! Bienvenue 🎉", ephemeral: true });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ Erreur attribution rôle.", ephemeral: true });
      }
    }

    if (interaction.customId.startsWith('toggle_') && interaction.customId.endsWith('_role')) {
      const platformId = interaction.customId.split('_')[1];
    
      const PLATFORM_ROLE_MAP = {
        twitch: '1364945730372112496',
        youtube: '1364957258215063584',
      };
    
      const roleId = PLATFORM_ROLE_MAP[platformId];
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: "❌ Rôle introuvable.", ephemeral: true });
    
      const member = interaction.member;
      const hasRole = member.roles.cache.has(role.id);
    
      try {
        if (hasRole) {
          await member.roles.remove(role);
          await interaction.reply({ content: `❌ Rôle ${platformId} retiré.`, ephemeral: true });
        } else {
          await member.roles.add(role);
          await interaction.reply({ content: `✅ Rôle ${platformId} ajouté !`, ephemeral: true });
        }
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ Erreur avec le rôle.", ephemeral: true });
      }
    }
    
  }

  // Commandes Slash
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Erreur dans la commande.', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
