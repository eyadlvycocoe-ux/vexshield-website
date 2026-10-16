'use strict';

const {
    Client,
    GatewayIntentBits,
    ChannelType,
    PermissionFlagsBits,
    ActivityType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const {
    initDb,
    verifyServerLicense,
    saveGuildConnection,
    getGuildConnection,
    removeGuildConnection,
    saveServerWebhooks,
    getPool,
} = require('./db');

const http = require('http');

const {
    buildConnectSuccessEmbed,
    buildCreateSuccessEmbed,
    buildStatusEmbed,
    buildErrorEmbed,
    buildHelpEmbed,
    buildJailBanEmbed,
} = require('./embeds');

const { deployCommands } = require('./deploy-commands');
const { ensureGuildCustomEmojis } = require('./emoji-manager');
const { handleBlacklistInteraction, preloadBlacklistData } = require('./blacklist-manager');
const { initSelfBot } = require('./selfbot');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

const readyEventName = 'clientReady' in client ? 'clientReady' : 'ready';
client.once(readyEventName, async () => {
    console.log(`=================================================`);
    console.log(`🛡️ VexShield Network Bot is Online!`);
    console.log(`🤖 Logged in as: ${client.user.tag}`);
    console.log(`=================================================`);

    // Initialize Database Table
    await initDb();

    // Deploy / Clear Slash Commands to Discord API
    await deployCommands();

    // Pre-load Blacklist Data into memory (asynchronous & non-blocking)
    preloadBlacklistData().catch(() => { });

    // Initialize Self-Bot if TOKEN provided
    initSelfBot(client);

    // Set Bot Activity
    client.user.setActivity('VexShield Anticheat', { type: ActivityType.Watching });

    // Set Bot Avatar to logo.png
    const LOGO_PATH = path.join(__dirname, 'logo.png');
    if (fs.existsSync(LOGO_PATH)) {
        try {
            await client.user.setAvatar(LOGO_PATH);
            console.log('🖼️ Bot avatar updated to VexShield logo successfully!');
        } catch (avatarErr) {
            console.log(`ℹ️ Bot avatar check: ${avatarErr.message}`);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // If there are buttons / modals, allow blacklist interaction handling
        const blacklistHandled = await handleBlacklistInteraction(client, interaction);
        if (blacklistHandled) return;

        // All slash commands have been removed per user instructions
        if (interaction.isChatInputCommand()) {
            return;
        }
    } catch (error) {
        console.error('Interaction error:', error);
    }
});

// Internal HTTP API for Website Trigger (e.g. Confirm Cheating Ban)
const botServer = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'online', bot: 'VexShield Network', timestamp: new Date().toISOString() }));
    }

    if (req.method === 'POST' && req.url === '/post-jail-ban') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const { server_id, server_name, player_name, discord_id, reason, duration, clip_url, punishment_id, avatar_url, identifiers } = data;
                if (!server_id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'server_id required' }));
                }

                const pool = await getPool();
                const [rows] = await pool.query('SELECT guild_id FROM discord_bot_connections WHERE server_id = ? LIMIT 1', [server_id]);
                if (!rows || rows.length === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'No Discord guild connected for this server_id.' }));
                }

                const guildId = rows[0].guild_id;
                const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
                if (!guild) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Discord guild not found or bot removed.' }));
                }

                const punishmentsChannel = guild.channels.cache.find(
                    c => c.isTextBased() && (c.name.includes('punishments') || c.name.includes('jail'))
                );

                if (!punishmentsChannel) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Punishments channel not found.' }));
                }

                let resolvedPlayerName = player_name;
                let resolvedAvatarUrl = avatar_url;
                if (discord_id) {
                    try {
                        const fetchedUser = await client.users.fetch(discord_id).catch(() => null);
                        if (fetchedUser) {
                            resolvedPlayerName = fetchedUser.globalName || fetchedUser.username || player_name;
                            resolvedAvatarUrl = fetchedUser.displayAvatarURL({ extension: 'png', size: 512 });
                        }
                    } catch { }
                }

                const customEmojis = await ensureGuildCustomEmojis(guild);

                const payload = buildJailBanEmbed({
                    playerName: resolvedPlayerName,
                    discordId: discord_id,
                    reason,
                    duration,
                    clipUrl: clip_url,
                    punishmentId: punishment_id,
                    avatarUrl: resolvedAvatarUrl,
                    identifiers: identifiers,
                    serverName: server_name,
                    customEmojis: customEmojis
                });

                await punishmentsChannel.send(payload);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: 'Ban embed posted by VexShield Bot successfully!' }));
            } catch (err) {
                console.error('Error posting jail ban embed:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

const BOT_PORT = process.env.PORT || process.env.BOT_PORT || 5055;
botServer.listen(BOT_PORT, '0.0.0.0', () => {
    console.log(`📡 VexShield Bot HTTP API listening on 0.0.0.0:${BOT_PORT}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
