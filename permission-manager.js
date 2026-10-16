'use strict';

const fs = require('fs');
const path = require('path');

const allowedUsersPath = path.join(__dirname, 'allowed_blacklist_users.json');

function loadAllowedUsers() {
    if (!fs.existsSync(allowedUsersPath)) {
        fs.writeFileSync(allowedUsersPath, JSON.stringify({ allowedUsers: [] }, null, 2), 'utf8');
        return [];
    }
    try {
        const data = JSON.parse(fs.readFileSync(allowedUsersPath, 'utf8') || '{"allowedUsers":[]}');
        return Array.isArray(data.allowedUsers) ? data.allowedUsers : [];
    } catch {
        return [];
    }
}

function saveAllowedUsers(users) {
    fs.writeFileSync(allowedUsersPath, JSON.stringify({ allowedUsers: users }, null, 2), 'utf8');
}

function hasBlacklistPermission(userId, ownerId = '1339366537085321257', trustedUsers = []) {
    if (userId === ownerId) return true;
    if (trustedUsers.includes(userId)) return true;
    const users = loadAllowedUsers();
    return users.some(u => u.id === userId);
}

function grantBlacklistPermission(userId, grantedBy) {
    const users = loadAllowedUsers();
    if (users.some(u => u.id === userId)) {
        return { ok: false, error: 'User already has permission to add to blacklist.' };
    }
    users.push({
        id: userId,
        grantedAt: new Date().toISOString(),
        grantedBy: grantedBy || null,
    });
    saveAllowedUsers(users);
    return { ok: true };
}

function revokeBlacklistPermission(userId) {
    const users = loadAllowedUsers();
    const updated = users.filter(u => u.id !== userId);
    if (updated.length === users.length) {
        return { ok: false, error: 'User does not have custom blacklist permission.' };
    }
    saveAllowedUsers(updated);
    return { ok: true };
}

function listAllowedUsers() {
    return loadAllowedUsers();
}

module.exports = {
    loadAllowedUsers,
    hasBlacklistPermission,
    grantBlacklistPermission,
    revokeBlacklistPermission,
    listAllowedUsers,
};
