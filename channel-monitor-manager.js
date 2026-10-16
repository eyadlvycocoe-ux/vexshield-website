'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const envPath = path.join(__dirname, '.env');

function parseChannels(value) {
    if (!value || !value.trim()) return [];
    return value.split(',').map(id => id.trim()).filter(Boolean);
}

function readEnvContent() {
    if (!fs.existsSync(envPath)) return '';
    return fs.readFileSync(envPath, 'utf8');
}

function writeEnvVar(key, value) {
    let content = readEnvContent();
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;
    if (regex.test(content)) {
        content = content.replace(regex, line);
    } else {
        content = content.trimEnd() + `\n${line}\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    process.env[key] = value;
}

function addMonitorChannel(channelId) {
    const cleanId = channelId.trim();
    let monitorList = parseChannels(process.env.MONITOR_CHANNELS);
    let trustedList = parseChannels(process.env.TRUSTED_CHANNELS);

    let addedMonitor = false;
    let addedTrusted = false;

    if (!monitorList.includes(cleanId)) {
        monitorList.push(cleanId);
        writeEnvVar('MONITOR_CHANNELS', monitorList.join(','));
        addedMonitor = true;
    }

    if (!trustedList.includes(cleanId)) {
        trustedList.push(cleanId);
        writeEnvVar('TRUSTED_CHANNELS', trustedList.join(','));
        addedTrusted = true;
    }

    // Try to trigger live reload in selfbot if loaded
    try {
        const { reloadMonitorChannels } = require('./selfbot');
        if (typeof reloadMonitorChannels === 'function') {
            reloadMonitorChannels();
        }
    } catch { }

    return { ok: true, addedMonitor, addedTrusted, monitorList, trustedList };
}

function removeMonitorChannel(channelId) {
    const cleanId = channelId.trim();
    let monitorList = parseChannels(process.env.MONITOR_CHANNELS);
    let trustedList = parseChannels(process.env.TRUSTED_CHANNELS);

    const newMonitor = monitorList.filter(id => id !== cleanId);
    const newTrusted = trustedList.filter(id => id !== cleanId);

    const removed = newMonitor.length < monitorList.length || newTrusted.length < trustedList.length;

    writeEnvVar('MONITOR_CHANNELS', newMonitor.join(','));
    writeEnvVar('TRUSTED_CHANNELS', newTrusted.join(','));

    try {
        const { reloadMonitorChannels } = require('./selfbot');
        if (typeof reloadMonitorChannels === 'function') {
            reloadMonitorChannels();
        }
    } catch { }

    return { ok: true, removed, monitorList: newMonitor, trustedList: newTrusted };
}

function getMonitoredChannels() {
    return {
        monitor: parseChannels(process.env.MONITOR_CHANNELS),
        trusted: parseChannels(process.env.TRUSTED_CHANNELS),
    };
}

module.exports = {
    addMonitorChannel,
    removeMonitorChannel,
    getMonitoredChannels,
};
