'use strict';

const { REST, Routes } = require('discord.js');
require('dotenv').config();

// User requested all commands to be removed from the bot
const commands = [];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

async function deployCommands() {
    try {
        console.log('🔄 Clearing/refreshing application (/) slash commands...');

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Successfully cleared/removed all slash commands globally!');
    } catch (error) {
        console.error('❌ Error deploying/clearing slash commands:', error);
    }
}

if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands, commands };
