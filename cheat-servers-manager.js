'use strict';

const fs = require('fs');
const path = require('path');
const { addMonitorChannel } = require('./channel-monitor-manager');

const cheatServersPath = path.join(__dirname, 'cheatServers.json');

function loadCheatServers() {
    if (!fs.existsSync(cheatServersPath)) {
        fs.writeFileSync(cheatServersPath, '[]', 'utf8');
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(cheatServersPath, 'utf8') || '[]');
    } catch {
        return [];
    }
}

function saveCheatServers(servers) {
    fs.writeFileSync(cheatServersPath, JSON.stringify(servers, null, 2), 'utf8');
}

function addCheatServer(guildId, channelId = null, guildName = null, guildIconUrl = null) {
    const servers = loadCheatServers();
    const existing = servers.find(s => s.guildId === guildId);
    if (existing) {
        if (guildName && !existing.guildName) existing.guildName = guildName;
        if (guildIconUrl && !existing.guildIconUrl) existing.guildIconUrl = guildIconUrl;
        if (channelId && !existing.channelId) existing.channelId = channelId;
        saveCheatServers(servers);

        let envResult = null;
        if (channelId) {
            envResult = addMonitorChannel(channelId);
        }
        return { ok: true, alreadyExisted: true, total: servers.length, envResult };
    }

    const normalizedChannelId = channelId?.trim() || null;

    const entry = {
        guildId,
        channelId: normalizedChannelId,
        addedAt: new Date().toISOString(),
    };
    if (guildName) entry.guildName = guildName;
    if (guildIconUrl) entry.guildIconUrl = guildIconUrl;

    servers.push(entry);
    saveCheatServers(servers);

    let envResult = null;
    if (normalizedChannelId) {
        envResult = addMonitorChannel(normalizedChannelId);
    }

    return { ok: true, alreadyExisted: false, total: servers.length, hasChannel: !!normalizedChannelId, envResult };
}

function formatCheatServersList() {
    const servers = loadCheatServers();
    if (servers.length === 0) return 'No cheat servers configured.';
    return servers.map((s, i) => {
        const namePart = s.guildName ? `**${s.guildName}**` : `Server \`${s.guildId}\``;
        const channelPart = s.channelId
            ? `→ **Monitor Channel**: \`${s.channelId}\``
            : '→ *(no monitor channel)*';
        return `${i + 1}. ${namePart} (\`${s.guildId}\`) ${channelPart}`;
    }).join('\n');
}

module.exports = {
    loadCheatServers,
    addCheatServer,
    formatCheatServersList,
};
