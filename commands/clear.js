const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages dans le salon.')
    .addIntegerOption(opt => opt.setName('nombre').setDescription('Nombre de messages à supprimer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    const amount = interaction.options.getInteger('nombre');
    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: '❌ Tu dois choisir un nombre entre 1 et 100.', ephemeral: true });
    }

    await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `🧹 ${amount} messages supprimés.`, ephemeral: true });
  }
};
