'use strict';

const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

let activePool = null;

async function getPool() {
    if (activePool) return activePool;

    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'avnadmin';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'defaultdb';
    const ssl = (process.env.DB_SSL === 'true' || host.includes('aivencloud.com'))
        ? { rejectUnauthorized: false }
        : undefined;

    activePool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 3,
        queueLimit: 0,
        ssl,
        connectTimeout: 10000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
    });

    return activePool;
}

/** Initialize database tables required for Discord bot connections */
async function initDb(retries = 5) {
    try {
        const pool = await getPool();
        await pool.query(`
            CREATE TABLE IF NOT EXISTS discord_bot_connections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL UNIQUE,
                guild_name VARCHAR(255),
                server_id VARCHAR(255) NOT NULL,
                license_key VARCHAR(255) NOT NULL,
                connected_by VARCHAR(255),
                connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (server_id) REFERENCES servers(server_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Database initialized & discord_bot_connections table ready.');
    } catch (error) {
        console.error('❌ Failed to initialize database table:', error.message);
        if (retries > 0) {
            console.log(`🔄 Retrying database initialization in 5s (${retries} retries left)...`);
            setTimeout(() => initDb(retries - 1), 5000);
        }
    }
}

/** Verify server license key and IP */
async function verifyServerLicense(licenseKey, ip) {
    const cleanLicense = String(licenseKey || '').trim();
    const cleanIp = String(ip || '').trim();

    if (!cleanLicense) {
        return { success: false, error: 'Please enter a valid License Key.' };
    }

    try {
        const pool = await getPool();
        const [rows] = await pool.query(
            `SELECT server_id, license_key, display_name, server_ip, status, expires_at, soft_deleted_at
             FROM servers 
             WHERE license_key = ? LIMIT 1`,
            [cleanLicense]
        );

        if (!rows || rows.length === 0) {
            return { success: false, error: 'Invalid License Key or server not found in the system!' };
        }

        const server = rows[0];

        if (server.soft_deleted_at || String(server.status || '').toLowerCase() === 'disabled' || String(server.license_key).startsWith('REVOKED-')) {
            return { success: false, error: 'This License Key is currently disabled or revoked!' };
        }

        if (server.expires_at && new Date(server.expires_at) < new Date()) {
            return { success: false, error: 'This License Key has expired!' };
        }

        // Update server_ip if provided and different
        if (cleanIp && cleanIp !== server.server_ip) {
            await pool.query('UPDATE servers SET server_ip = ?, last_update = NOW() WHERE server_id = ?', [cleanIp, server.server_id]);
            server.server_ip = cleanIp;
        }

        return {
            success: true,
            server: {
                server_id: server.server_id,
                license_key: server.license_key,
                display_name: server.display_name || 'AirShield Server',
                server_ip: server.server_ip || cleanIp || '127.0.0.1',
                status: server.status || 'active',
            },
        };
    } catch (error) {
        console.error('Database query error in verifyServerLicense:', error);
        return { success: false, error: `Database Error: ${error.message}` };
    }
}

/** Save Guild to Server Connection */
async function saveGuildConnection(guildId, guildName, serverId, licenseKey, connectedBy) {
    try {
        const pool = await getPool();
        await pool.query(
            `INSERT INTO discord_bot_connections (guild_id, guild_name, server_id, license_key, connected_by)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                guild_name = VALUES(guild_name),
                server_id = VALUES(server_id),
                license_key = VALUES(license_key),
                connected_by = VALUES(connected_by),
                connected_at = NOW()`,
            [guildId, guildName, serverId, licenseKey, connectedBy]
        );
        return true;
    } catch (error) {
        console.error('Failed to save guild connection:', error);
        return false;
    }
}

/** Get connected server for guild */
async function getGuildConnection(guildId) {
    try {
        const pool = await getPool();
        const [rows] = await pool.query(
            `SELECT c.*, s.display_name, s.server_ip, s.status, s.expires_at
             FROM discord_bot_connections c
             JOIN servers s ON c.server_id = s.server_id
             WHERE c.guild_id = ? LIMIT 1`,
            [guildId]
        );

        if (!rows || rows.length === 0) return null;
        return rows[0];
    } catch (error) {
        console.error('Failed to get guild connection:', error);
        return null;
    }
}

/** Remove guild connection */
async function removeGuildConnection(guildId) {
    try {
        const pool = await getPool();
        await pool.query('DELETE FROM discord_bot_connections WHERE guild_id = ?', [guildId]);
        return true;
    } catch (error) {
        console.error('Failed to remove guild connection:', error);
        return false;
    }
}

/** Parse settings helper */
function parseJson(str) {
    if (!str) return {};
    if (typeof str === 'object') return str;
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

/** Save Webhook URLs into server_settings table and trigger live sync command */
async function saveServerWebhooks(serverId, webhooks) {
    try {
        const pool = await getPool();
        // Fetch current settings if existing
        const [existing] = await pool.query('SELECT settings FROM server_settings WHERE server_id = ? LIMIT 1', [serverId]);
        const currentSettings = parseJson(existing?.[0]?.settings);

        const updatedDiscordWebhooks = {
            ...(currentSettings.discord_webhooks || {}),
            logsWebhook: webhooks.logsWebhook || '',
            logsLeave: webhooks.logsLeave || '',
            logsConnection: webhooks.logsConnection || '',
            logsBans: webhooks.logsBans || '',
            punishmentsWebhook: webhooks.punishmentsWebhook || '',
            logsPunishments: webhooks.punishmentsWebhook || '',
            logs: webhooks.logsWebhook || '',
        };

        const updatedSettings = {
            ...currentSettings,
            discord_webhooks: updatedDiscordWebhooks,
            logsWebhook: webhooks.logsWebhook || '',
            logsLeave: webhooks.logsLeave || '',
            logsConnection: webhooks.logsConnection || '',
            logsBans: webhooks.logsBans || '',
            punishmentsWebhook: webhooks.punishmentsWebhook || '',
        };

        const mainWebhook = webhooks.logsWebhook || webhooks.logsBans || '';

        await pool.query(
            `INSERT INTO server_settings (id, server_id, settings, anti_objects, anti_blackwords, discord_webhook, updated_at)
             VALUES (?, ?, ?, '[]', '[]', ?, NOW())
             ON DUPLICATE KEY UPDATE 
                settings = VALUES(settings),
                discord_webhook = VALUES(discord_webhook),
                updated_at = NOW()`,
            [crypto.randomUUID(), serverId, JSON.stringify(updatedSettings), mainWebhook]
        );

        // Queue update_settings command in dashboard_commands for instant FiveM sync
        const [pendingCmd] = await pool.query(
            `SELECT id FROM dashboard_commands 
             WHERE server_id = ? AND command_type = 'update_settings' AND status = 'pending' LIMIT 1`,
            [serverId]
        );

        if (!pendingCmd.length) {
            await pool.query(
                `INSERT INTO dashboard_commands (id, server_id, command_type, command_data) VALUES (?, ?, ?, ?)`,
                [crypto.randomUUID(), serverId, 'update_settings', JSON.stringify({ fetch_settings: true })]
            );
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to save server webhooks to database:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getPool,
    initDb,
    verifyServerLicense,
    saveGuildConnection,
    getGuildConnection,
    removeGuildConnection,
    saveServerWebhooks,
};
