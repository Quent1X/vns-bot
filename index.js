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
  const twitchRoleChannel = client.channels.cache.get(ROLE_SELECTOR_CHANNEL);
  if (twitchRoleChannel) {
    const embed = new EmbedBuilder()
      .setTitle('🎭 Choisis ton rôle Twitch')
      .setDescription(
        `🎮 Tu veux recevoir les notifications des lives Twitch ?\n\n` +
        `Clique ici pour recevoir le rôle <@&${TWITCH_ROLE_ID}>.\n` +
        `Tu pourras le retirer à tout moment.`
      )
      .setColor(0x9146FF)
      .setThumbnail('https://static-cdn.jtvnw.net/jtv_user_pictures/hosted_images/Twitch_Logo_Purple_RGB.png')
      .setFooter({ text: 'Sélection automatique de rôle - VNS' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_twitch_role')
        .setLabel('🎮 Je suis Streamer Twitch')
        .setStyle(ButtonStyle.Primary)
    );

    await twitchRoleChannel.send({ embeds: [embed], components: [row] });
    console.log('📩 Message de rôle Twitch envoyé');
  }
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

    if (interaction.customId === 'toggle_twitch_role') {
      const role = member.guild.roles.cache.get(TWITCH_ROLE_ID);
      if (!role) return interaction.reply({ content: "❌ Rôle Twitch introuvable.", ephemeral: true });

      const hasRole = member.roles.cache.has(role.id);
      try {
        if (hasRole) {
          await member.roles.remove(role);
          await interaction.reply({ content: "❌ Rôle Twitch retiré.", ephemeral: true });
        } else {
          await member.roles.add(role);
          await interaction.reply({ content: "✅ Rôle Twitch ajouté !", ephemeral: true });
        }
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ Erreur Twitch rôle.", ephemeral: true });
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
