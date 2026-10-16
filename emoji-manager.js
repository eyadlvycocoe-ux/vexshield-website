'use strict';

const fs = require('fs');
const path = require('path');

const EMOJI_DIR = path.join(__dirname, 'imoji');

/** Custom Emoji filename mappings for all PNG assets in /imoji */
const EMOJI_MAPPING = {
    title: '4534-tts-ban-white.png',
    user: '13371-memberwhite.png',
    username: '3590-verified-white.png',
    reason: '56644-tools.png',
    license: '84795-adminicon.png',
    server: '13860-house.png',
    clip: '82321-tts-external-link.png',
    time: '4655-stopwatch.png',
    pin: '1569-white-pin.png',
    check: '2647-check-yes-wb.png',
    info: '10447-information.png',
    currency: '10845-currency.png',
    megaphone: '1882-megaphone.png',
    nitro: '2577-white-nitro-boost.png',
    notify: '2904-notify-staff.png',
    link: '3007-link.png',
    crown: '4007-crown.png',
    staff: '5448-staff-white.png',
    developer: '56832-developer.png',
    right: '61991-right.png',
    dot: '6304-whitesmalldot.png',
    other: '7188-other-icon.png',
    partner: '7240-partner-white.png',
    whitemember: '7428-whitemember.png',
    star: '75645-star.png',
    mod: '7964-modbadgewhite.png',
    number: '88339-agenumber.png',
    level2: '9010-boost-level-2-white.png',
    crown2: '9049-crown.png',
    members: '91221-members.png',
    cart: '9183-shoppingcart.png',
    chat: '9891-chat-icon.png'
};

const emojiCache = new Map();
const isUploadingMap = new Map();

async function triggerBackgroundEmojiUpload(guild) {
    if (!guild || isUploadingMap.get(guild.id)) return;
    isUploadingMap.set(guild.id, true);

    try {
        const botMember = await guild.members.fetchMe().catch(() => null);
        if (!botMember || !botMember.permissions.has('ManageEmojisAndStickers')) {
            isUploadingMap.set(guild.id, false);
            return;
        }

        const existingEmojis = await guild.emojis.fetch().catch(() => guild.emojis.cache);

        for (const [key, filename] of Object.entries(EMOJI_MAPPING)) {
            const filePath = path.join(EMOJI_DIR, filename);
            if (!fs.existsSync(filePath)) continue;

            const emojiName = `air_${key.toLowerCase()}`;
            let match = null;
            if (existingEmojis && typeof existingEmojis.find === 'function') {
                match = existingEmojis.find(e => e.name === emojiName || e.name === key);
            }

            if (!match) {
                try {
                    match = await guild.emojis.create({
                        attachment: filePath,
                        name: emojiName,
                        reason: 'AirShield Custom Emoji Setup'
                    });
                    console.log(`[EmojiManager] Created custom emoji ${emojiName} on guild ${guild.name}`);
                } catch (err) {
                    console.warn(`[EmojiManager] Could not upload emoji ${emojiName}:`, err.message);
                }
            }
        }

        emojiCache.delete(guild.id);
    } catch (err) {
        console.error('[EmojiManager] Error in background upload:', err.message);
    } finally {
        isUploadingMap.set(guild.id, false);
    }
}

/**
 * Fast & Instant: Returns custom emojis map immediately without blocking.
 * Missing emojis are created asynchronously in the background.
 */
async function ensureGuildCustomEmojis(guild) {
    if (!guild) return {};
    const guildId = guild.id;

    if (emojiCache.has(guildId)) {
        return emojiCache.get(guildId);
    }

    const resultMap = {};
    const existingEmojis = guild.emojis?.cache;

    for (const [key] of Object.entries(EMOJI_MAPPING)) {
        const emojiName = `air_${key}`;
        let match = null;
        if (existingEmojis && typeof existingEmojis.find === 'function') {
            match = existingEmojis.find(e => e.name === emojiName || e.name === key);
        }
        if (match) {
            resultMap[key] = `<:${match.name}:${match.id}>`;
        } else {
            resultMap[key] = '';
        }
    }

    emojiCache.set(guildId, resultMap);

    // Asynchronously create missing emojis without blocking interaction
    triggerBackgroundEmojiUpload(guild).catch(() => {});

    return resultMap;
}

module.exports = {
    ensureGuildCustomEmojis,
    EMOJI_MAPPING
};
