'use strict';

const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const blacklistFilePath = path.join(__dirname, 'blacklist.json');

let selfBotClient = null;
let monitorChannelsList = [];
const lastBlacklistEntries = new Map();

function reloadMonitorChannels() {
    monitorChannelsList = process.env.MONITOR_CHANNELS ? process.env.MONITOR_CHANNELS.split(',').map(id => id.trim()).filter(Boolean) : [];
    console.log(`[Self-Bot] Reloaded monitor channels list (${monitorChannelsList.length} channels active)`);
    return monitorChannelsList;
}

function initSelfBot(mainClient) {
    const TOKEN = process.env.SELF_BOT_TOKEN;
    reloadMonitorChannels();

    if (!TOKEN || TOKEN === 'YOUR_USER_TOKEN_HERE') {
        console.warn('[Self-Bot] SELF_BOT_TOKEN is missing or not set in .env. Self-bot will not start.');
        return null;
    }

    selfBotClient = new Client({
        checkUpdate: false,
    });

    const { addCheatServer } = require('./cheat-servers-manager');

    const autoSyncSelfBotGuilds = () => {
        if (!selfBotClient || !selfBotClient.guilds?.cache) return;
        let addedCount = 0;
        selfBotClient.guilds.cache.forEach(guild => {
            try {
                let iconUrl = null;
                try {
                    iconUrl = guild.iconURL({ dynamic: true, size: 512 });
                } catch (e) { }
                const res = addCheatServer(guild.id, null, guild.name, iconUrl);
                if (res && !res.alreadyExisted) {
                    addedCount++;
                }
            } catch (e) {
                console.error(`[Self-Bot Auto-Sync] Error adding guild ${guild.id}:`, e.message);
            }
        });
        console.log(`[Self-Bot Auto-Sync] Synced ${selfBotClient.guilds.cache.size} self-bot server(s) to cheatServers.json (${addedCount} new added).`);
    };

    const onSelfBotReady = () => {
        console.log(`[Self-Bot] Logged in as ${selfBotClient.user?.tag || 'okacha474'}!`);
        console.log(`[Self-Bot] Monitoring channels: ${monitorChannelsList.join(', ')}`);
        autoSyncSelfBotGuilds();
    };

    if ('clientReady' in selfBotClient) {
        selfBotClient.on('clientReady', onSelfBotReady);
    } else {
        selfBotClient.on('ready', onSelfBotReady);
    }

    selfBotClient.on('guildCreate', (guild) => {
        try {
            console.log(`[Self-Bot Auto-Sync] Self-Bot joined new server: ${guild.name} (${guild.id}). Adding to cheatServers.json...`);
            let iconUrl = null;
            try {
                iconUrl = guild.iconURL({ dynamic: true, size: 512 });
            } catch (e) { }
            addCheatServer(guild.id, null, guild.name, iconUrl);
        } catch (e) {
            console.error(`[Self-Bot Auto-Sync] Error adding joined guild ${guild.id}:`, e.message);
        }
    });

    selfBotClient.on('messageCreate', async (message) => {
        if (!monitorChannelsList.includes(message.channelId)) return;
        if (message.author.bot) return;

        const content = message.content;

        let screenshotUrls = [];
        let videoUrls = [];

        if (message.attachments.size > 0) {
            message.attachments.forEach(attachment => {
                const contentType = attachment.contentType || '';
                console.log('[Self-Bot] Main message attachment:', attachment.name, '- type:', contentType);
                if (contentType.startsWith('image/')) screenshotUrls.push(attachment.url);
                else if (contentType.startsWith('video/')) videoUrls.push(attachment.url);
            });
        }

        const mediaRegex = /(https?:\/\/\S+)/gi;
        const mediaLinks = [...content.matchAll(mediaRegex)];

        for (const match of mediaLinks) {
            const link = match[0];
            if (link.includes('.mp4') || link.includes('.webm') || link.includes('.mov') || link.includes('youtube') || link.includes('youtu.be') || link.includes('streamable') || link.includes('media.electron-services.com')) {
                if (!videoUrls.includes(link)) videoUrls.push(link);
            } else if (link.includes('.png') || link.includes('.jpg') || link.includes('.jpeg') || link.includes('.webp') || link.includes('.gif')) {
                if (!screenshotUrls.includes(link)) screenshotUrls.push(link);
            }
        }

        const lines = content.split('\n').map(line => line.trim()).filter(line => line);

        let userBlocks = [];
        let currentBlock = {
            discord: null,
            license: null,
            license2: null,
            steam: 'no linked',
            fivem: null,
            live: null,
            xbl: null,
            reason: 'No reason provided',
            time: 'Permanent',
            screenshotUrls: [],
            videoUrls: []
        };

        for (const line of lines) {
            const isNewBlockStart =
                line.match(/^-\d+/) ||
                line.match(/^`?\d+`?(\s+<@!?\d+>|\s+@\S+|$)/) ||
                line.toLowerCase().startsWith('new:') ||
                line.toLowerCase().startsWith('old:');

            if (isNewBlockStart) {
                if (currentBlock.discord) {
                    userBlocks.push({ ...currentBlock });
                }
                currentBlock = {
                    discord: null,
                    license: null,
                    license2: null,
                    steam: 'no linked',
                    fivem: null,
                    live: null,
                    xbl: null,
                    reason: 'No reason provided',
                    time: 'Permanent',
                    screenshotUrls: [],
                    videoUrls: []
                };
            }

            const discordMatch = line.match(/discord[:\s]*"?(\d{17,20})"?/i) || line.match(/<@!?(\d{17,20})>/);
            const licenseMatch = line.match(/(?:license)[:\s]*"?([a-f0-9]{30,50})"?/i);
            const license2Match = line.match(/(?:license2)[:\s]*"?([a-f0-9]{30,50})"?/i);
            const steamMatch = line.match(/(?:steam)[:\s]*"?(\S+?)"?[,\s]*$/i);
            const fivemMatch = line.match(/(?:fivem)[:\s]*"?(\S+?)"?[,\s]*$/i);
            const liveMatch = line.match(/(?:live)[:\s]*"?(\S+?)"?[,\s]*$/i);
            const xblMatch = line.match(/(?:xbl)[:\s]*"?(\S+?)"?[,\s]*$/i);
            const reasonMatch = line.match(/Reason\s*[:\-]\s*(.+)/i);
            const timeMatch = line.match(/Time\s*[:\-]\s*(.+)/i);

            if (discordMatch) currentBlock.discord = discordMatch[1];
            if (licenseMatch) currentBlock.license = `license:${licenseMatch[1]}`;
            if (license2Match) currentBlock.license2 = `license2:${license2Match[1]}`;
            if (steamMatch) currentBlock.steam = steamMatch[1];
            if (fivemMatch) currentBlock.fivem = fivemMatch[1];
            if (liveMatch) currentBlock.live = liveMatch[1];
            if (xblMatch) currentBlock.xbl = xblMatch[1];
            if (reasonMatch) currentBlock.reason = reasonMatch[1].trim();
            if (timeMatch) currentBlock.time = timeMatch[1].trim();

            const lineMediaRegex = /(https?:\/\/\S+)/gi;
            const lineMediaMatches = line.match(lineMediaRegex);
            if (lineMediaMatches) {
                for (const link of lineMediaMatches) {
                    const cleanLink = link.replace(/[",]/g, '');
                    if (cleanLink.includes('.mp4') || cleanLink.includes('.webm') || cleanLink.includes('.mov') || cleanLink.includes('youtube') || cleanLink.includes('youtu.be') || cleanLink.includes('streamable') || cleanLink.includes('media.electron-services.com')) {
                        if (!currentBlock.videoUrls.includes(cleanLink)) currentBlock.videoUrls.push(cleanLink);
                    } else if (cleanLink.includes('.png') || cleanLink.includes('.jpg') || cleanLink.includes('.jpeg') || cleanLink.includes('.webp') || cleanLink.includes('.gif')) {
                        if (!currentBlock.screenshotUrls.includes(cleanLink)) currentBlock.screenshotUrls.push(cleanLink);
                    }
                }
            }
        }

        if (currentBlock.discord) {
            userBlocks.push(currentBlock);
        }

        if (userBlocks.length === 0) {
            const singleDiscordMatch = content.match(/discord:(\d{17,20})/i) || content.match(/<@!?(\d{17,20})>/);
            if (singleDiscordMatch) {
                const singleBlock = {
                    discord: singleDiscordMatch[1],
                    license: null,
                    license2: null,
                    steam: 'no linked',
                    fivem: null,
                    live: null,
                    xbl: null,
                    reason: 'No reason provided',
                    time: 'Permanent'
                };

                const singleLicenseMatch = content.match(/(?:license|license2):([a-f0-9]{30,50})/i);
                const singleSteamMatch = content.match(/steam:(\S+)/i);
                const singleReasonMatch = content.match(/Reason\s*[:\-]\s*(.+)/i);
                const singleTimeMatch = content.match(/Time\s*[:\-]\s*(.+)/i);

                if (singleLicenseMatch) singleBlock.license = `license:${singleLicenseMatch[1]}`;
                if (singleSteamMatch) singleBlock.steam = singleSteamMatch[1];
                if (singleReasonMatch) singleBlock.reason = singleReasonMatch[1].trim();
                if (singleTimeMatch) singleBlock.time = singleTimeMatch[1].trim();

                userBlocks.push(singleBlock);
            }
        }

        if (userBlocks.length > 0) {
            console.log(`[Self-Bot] Detected ${userBlocks.length} user(s) in message`);

            const allDiscordIds = userBlocks.map(block => block.discord).filter(id => id);
            const key = `${message.channelId}-${message.author.id}`;
            lastBlacklistEntries.set(key, {
                discordIds: allDiscordIds,
                timestamp: Date.now(),
                existingScreenshots: [...screenshotUrls],
                existingVideos: [...videoUrls]
            });

            for (const userBlock of userBlocks) {
                const discordId = userBlock.discord;
                if (!discordId || discordId === message.author.id || discordId === selfBotClient.user.id) {
                    continue;
                }

                const licenseInfo = userBlock.license || userBlock.license2 || 'Not Provided';
                const steamInfo = userBlock.steam;
                const finalScreenshots = userBlock.screenshotUrls.length > 0 ? userBlock.screenshotUrls : screenshotUrls;
                const finalVideos = userBlock.videoUrls.length > 0 ? userBlock.videoUrls : videoUrls;

                const banData = {
                    identifiers: {
                        license: licenseInfo,
                        steam: steamInfo,
                        discord: `discord:${discordId}`
                    },
                    playerInfo: { name: discordId, ip: 'Hidden' },
                    banDetails: {
                        reason: `${userBlock.reason} (Time: ${userBlock.time})`,
                        serverName: message.guild ? message.guild.name : 'Unknown Server',
                        guildId: message.guild ? message.guild.id : null,
                        channelId: message.channelId,
                        channelName: message.channel.name || 'Unknown Channel',
                        screenshotUrls: finalScreenshots,
                        videoUrls: finalVideos,
                        addedAt: new Date().toISOString(),
                        type: 'Global'
                    }
                };

                try {
                    const { getBlacklistData, saveBlacklistData } = require('./blacklist-manager');
                    let blacklist = getBlacklistData();

                    const isDuplicate = blacklist.some(existing => {
                        const sameServer = (existing.banDetails.guildId && banData.banDetails.guildId && existing.banDetails.guildId === banData.banDetails.guildId) ||
                            (existing.banDetails.channelId === banData.banDetails.channelId) ||
                            (existing.banDetails.serverName === banData.banDetails.serverName);

                        const sameDiscord = existing.identifiers.discord === banData.identifiers.discord;
                        const sameLicense = existing.identifiers.license === banData.identifiers.license && banData.identifiers.license !== 'Not Provided';
                        const sameSteam = existing.identifiers.steam === banData.identifiers.steam && banData.identifiers.steam !== 'no linked';

                        return sameServer && (sameDiscord || sameLicense || sameSteam);
                    });

                    if (!isDuplicate) {
                        blacklist.push(banData);
                        saveBlacklistData(blacklist);
                        console.log(`[Self-Bot] Added user: ${discordId}`);
                        if (mainClient) {
                            try {
                                const { sendGlobalBlacklistLog } = require('./blacklist-manager');
                                await sendGlobalBlacklistLog(mainClient, banData);
                            } catch (e) { }
                        }
                    } else {
                        console.log(`[Self-Bot] Skipping duplicate user in live monitoring: ${discordId}`);
                    }
                } catch (error) {
                    console.error(`[Self-Bot] Error processing ${discordId}:`, error);
                }
            }
            return;
        }

        const hasAttachment = message.attachments.size > 0;
        const followupMediaRegex = /(https?:\/\/\S+)/gi;
        const followupMediaLinks = [...content.matchAll(followupMediaRegex)];

        if (hasAttachment || followupMediaLinks.length > 0) {
            const key = `${message.channelId}-${message.author.id}`;
            const lastEntry = lastBlacklistEntries.get(key);

            if (lastEntry && (Date.now() - lastEntry.timestamp) < 30000) {
                let newScreenshots = [...lastEntry.existingScreenshots];
                let newVideos = [...lastEntry.existingVideos];

                if (hasAttachment) {
                    message.attachments.forEach(attachment => {
                        const contentType = attachment.contentType || '';
                        if (contentType.startsWith('image/') && !newScreenshots.includes(attachment.url)) newScreenshots.push(attachment.url);
                        else if (contentType.startsWith('video/') && !newVideos.includes(attachment.url)) newVideos.push(attachment.url);
                    });
                }

                for (const match of followupMediaLinks) {
                    const link = match[0];
                    if (link.includes('.mp4') || link.includes('.webm') || link.includes('.mov') || link.includes('youtube') || link.includes('youtu.be') || link.includes('streamable') || link.includes('media.electron-services.com')) {
                        if (!newVideos.includes(link)) newVideos.push(link);
                    } else if (link.includes('.png') || link.includes('.jpg') || link.includes('.jpeg') || link.includes('.webp') || link.includes('.gif')) {
                        if (!newScreenshots.includes(link)) newScreenshots.push(link);
                    }
                }

                try {
                    let blacklist = JSON.parse(fs.readFileSync(blacklistFilePath, 'utf8') || '[]');
                    let updated = false;

                    for (const discordId of lastEntry.discordIds) {
                        const entryIndex = blacklist.findLastIndex(b => b.identifiers.discord === `discord:${discordId}`);
                        if (entryIndex !== -1) {
                            blacklist[entryIndex].banDetails.screenshotUrls = newScreenshots;
                            blacklist[entryIndex].banDetails.videoUrls = newVideos;
                            updated = true;
                        }
                    }

                    if (updated) {
                        fs.writeFileSync(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
                        console.log(`[Self-Bot] Updated last blacklist entries with follow-up media.`);
                    }
                } catch (error) {
                    console.error('[Self-Bot] Error updating follow-up media:', error);
                }
            }
        }
    });

    selfBotClient.login(TOKEN).catch(err => {
        console.error('[Self-Bot] Failed to login:', err.message);
    });

    return selfBotClient;
}

async function scrapeChannelBans(channelId, maxMessages = 200, onProgress = null) {
    if (!selfBotClient || !selfBotClient.isReady()) {
        throw new Error('Self-bot client is not online or ready.');
    }
    const channel = await selfBotClient.channels.fetch(channelId).catch(err => {
        if (err.code === 50001 || err.code === 50013 || err.message?.includes('Missing Access') || err.message?.includes('Missing Permissions')) {
            throw new Error(`Missing Access: Self-bot cannot access channel ${channelId}.`);
        }
        throw err;
    });
    if (!channel) {
        throw new Error(`Channel ${channelId} not found or not accessible by self-bot.`);
    }

    if (channel.viewable === false) {
        throw new Error(`Missing Access: Self-bot cannot view channel ${channel.name || channelId}.`);
    }
    if (channel.permissionsFor && selfBotClient.user) {
        const perms = channel.permissionsFor(selfBotClient.user);
        if (perms && (!perms.has('VIEW_CHANNEL') || !perms.has('READ_MESSAGE_HISTORY'))) {
            throw new Error(`Missing Access: Self-bot lacks permissions to read message history in ${channel.name || channelId}.`);
        }
    }

    let fetchedCount = 0;
    let lastId = null;
    let newEntriesCount = 0;

    while (fetchedCount < maxMessages) {
        const fetchOptions = { limit: Math.min(100, maxMessages - fetchedCount) };
        if (lastId) fetchOptions.before = lastId;

        let messages;
        try {
            messages = await channel.messages.fetch(fetchOptions);
        } catch (err) {
            if (err.code === 50001 || err.code === 50013 || err.message?.includes('Missing Access') || err.message?.includes('Missing Permissions')) {
                throw new Error(`Missing Access: Self-bot cannot read messages in ${channel.name || channelId}.`);
            }
            throw err;
        }

        if (!messages || messages.size === 0) break;

        for (const message of messages.values()) {
            lastId = message.id;
            const content = message.content;

            let screenshotUrls = [];
            let videoUrls = [];

            if (message.attachments && message.attachments.size > 0) {
                message.attachments.forEach(attachment => {
                    const contentType = attachment.contentType || '';
                    if (contentType.startsWith('image/')) screenshotUrls.push(attachment.url);
                    else if (contentType.startsWith('video/')) videoUrls.push(attachment.url);
                });
            }

            const mediaRegex = /(https?:\/\/\S+)/gi;
            const mediaLinks = [...content.matchAll(mediaRegex)];
            for (const match of mediaLinks) {
                const link = match[0];
                if (link.includes('.mp4') || link.includes('.webm') || link.includes('.mov') || link.includes('youtube') || link.includes('streamable') || link.includes('media.electron-services.com')) {
                    if (!videoUrls.includes(link)) videoUrls.push(link);
                } else if (link.includes('.png') || link.includes('.jpg') || link.includes('.jpeg') || link.includes('.webp') || link.includes('.gif')) {
                    if (!screenshotUrls.includes(link)) screenshotUrls.push(link);
                }
            }

            const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
            let userBlocks = [];
            let currentBlock = {
                discord: null,
                license: null,
                license2: null,
                steam: 'no linked',
                fivem: null,
                live: null,
                xbl: null,
                reason: 'No reason provided',
                time: 'Permanent',
                screenshotUrls: [],
                videoUrls: []
            };

            for (const line of lines) {
                const isNewBlockStart =
                    line.match(/^-\d+/) ||
                    line.match(/^`?\d+`?(\s+<@!?\d+>|\s+@\S+|$)/) ||
                    line.toLowerCase().startsWith('new:') ||
                    line.toLowerCase().startsWith('old:');

                if (isNewBlockStart) {
                    if (currentBlock.discord) userBlocks.push({ ...currentBlock });
                    currentBlock = {
                        discord: null,
                        license: null,
                        license2: null,
                        steam: 'no linked',
                        fivem: null,
                        live: null,
                        xbl: null,
                        reason: 'No reason provided',
                        time: 'Permanent',
                        screenshotUrls: [],
                        videoUrls: []
                    };
                }

                const discordMatch = line.match(/discord[:\s]*"?(\d{17,20})"?/i) || line.match(/<@!?(\d{17,20})>/);
                const licenseMatch = line.match(/(?:license)[:\s]*"?([a-f0-9]{30,50})"?/i);
                const license2Match = line.match(/(?:license2)[:\s]*"?([a-f0-9]{30,50})"?/i);
                const steamMatch = line.match(/(?:steam)[:\s]*"?(\S+?)"?[,\s]*$/i);
                const reasonMatch = line.match(/Reason\s*[:\-]\s*(.+)/i);
                const timeMatch = line.match(/Time\s*[:\-]\s*(.+)/i);

                if (discordMatch) currentBlock.discord = discordMatch[1];
                if (licenseMatch) currentBlock.license = `license:${licenseMatch[1]}`;
                if (license2Match) currentBlock.license2 = `license2:${license2Match[1]}`;
                if (steamMatch) currentBlock.steam = steamMatch[1];
                if (reasonMatch) currentBlock.reason = reasonMatch[1].trim();
                if (timeMatch) currentBlock.time = timeMatch[1].trim();

                const lineMediaMatches = line.match(/(https?:\/\/\S+)/gi);
                if (lineMediaMatches) {
                    for (const link of lineMediaMatches) {
                        const cleanLink = link.replace(/[",]/g, '');
                        if (cleanLink.includes('.mp4') || cleanLink.includes('.webm') || cleanLink.includes('.mov') || cleanLink.includes('youtube') || cleanLink.includes('streamable') || cleanLink.includes('media.electron-services.com')) {
                            if (!currentBlock.videoUrls.includes(cleanLink)) currentBlock.videoUrls.push(cleanLink);
                        } else if (cleanLink.includes('.png') || cleanLink.includes('.jpg') || cleanLink.includes('.jpeg') || cleanLink.includes('.webp') || cleanLink.includes('.gif')) {
                            if (!currentBlock.screenshotUrls.includes(cleanLink)) currentBlock.screenshotUrls.push(cleanLink);
                        }
                    }
                }
            }

            if (currentBlock.discord) userBlocks.push(currentBlock);

            if (userBlocks.length === 0) {
                const singleDiscordMatch = content.match(/discord:(\d{17,20})/i) || content.match(/<@!?(\d{17,20})>/);
                if (singleDiscordMatch) {
                    const singleBlock = {
                        discord: singleDiscordMatch[1],
                        license: null,
                        license2: null,
                        steam: 'no linked',
                        fivem: null,
                        live: null,
                        xbl: null,
                        reason: 'No reason provided',
                        time: 'Permanent'
                    };
                    const singleLicenseMatch = content.match(/(?:license|license2):([a-f0-9]{30,50})/i);
                    const singleSteamMatch = content.match(/steam:(\S+)/i);
                    const singleReasonMatch = content.match(/Reason\s*[:\-]\s*(.+)/i);
                    const singleTimeMatch = content.match(/Time\s*[:\-]\s*(.+)/i);

                    if (singleLicenseMatch) singleBlock.license = `license:${singleLicenseMatch[1]}`;
                    if (singleSteamMatch) singleBlock.steam = singleSteamMatch[1];
                    if (singleReasonMatch) singleBlock.reason = singleReasonMatch[1].trim();
                    if (singleTimeMatch) singleBlock.time = singleTimeMatch[1].trim();

                    userBlocks.push(singleBlock);
                }
            }

            for (const userBlock of userBlocks) {
                const discordId = userBlock.discord;
                if (!discordId || (selfBotClient && discordId === selfBotClient.user.id)) continue;

                const licenseInfo = userBlock.license || userBlock.license2 || 'Not Provided';
                const steamInfo = userBlock.steam;
                const finalScreenshots = userBlock.screenshotUrls.length > 0 ? userBlock.screenshotUrls : screenshotUrls;
                const finalVideos = userBlock.videoUrls.length > 0 ? userBlock.videoUrls : videoUrls;

                const banData = {
                    identifiers: {
                        license: licenseInfo,
                        steam: steamInfo,
                        discord: `discord:${discordId}`
                    },
                    playerInfo: { name: discordId, ip: 'Hidden' },
                    banDetails: {
                        reason: `${userBlock.reason} (Time: ${userBlock.time})`,
                        serverName: message.guild ? message.guild.name : 'Scraped Server',
                        guildId: message.guild ? message.guild.id : null,
                        channelId: message.channelId,
                        channelName: message.channel.name || 'Scraped Channel',
                        screenshotUrls: finalScreenshots,
                        videoUrls: finalVideos,
                        addedAt: new Date(message.createdTimestamp).toISOString(),
                        type: 'Global'
                    }
                };

                const { getBlacklistData, saveBlacklistData } = require('./blacklist-manager');
                let blacklist = getBlacklistData();

                const isDuplicate = blacklist.some(existing => existing.identifiers.discord === banData.identifiers.discord);
                if (!isDuplicate) {
                    blacklist.push(banData);
                    saveBlacklistData(blacklist);
                    newEntriesCount++;
                }
            }
        }

        fetchedCount += messages.size;
        if (typeof onProgress === 'function') {
            await onProgress({
                fetchedCount,
                maxMessages,
                newEntriesCount,
                channelName: channel.name
            });
        }
    }

    return { fetchedCount, newEntriesCount };
}

async function scrapeGuildBans(guildId, maxMessagesPerChannel = 200, onProgress = null) {
    if (!selfBotClient || !selfBotClient.isReady()) {
        throw new Error('Self-bot client is not online or ready.');
    }
    const guild = await selfBotClient.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
        throw new Error(`Server / Guild ${guildId} not found or not accessible by self-bot.`);
    }

    const channels = await guild.channels.fetch().catch(() => null);
    if (!channels) {
        throw new Error(`Could not fetch channels for server ${guild.name || guildId}.`);
    }

    const textChannels = Array.from(channels.values()).filter(c => {
        if (!c) return false;
        const isText = c.type === 'GUILD_TEXT' || c.type === 0;
        if (!isText) return false;
        if (c.viewable === false) return false;
        if (c.permissionsFor && selfBotClient.user) {
            const perms = c.permissionsFor(selfBotClient.user);
            if (perms && (!perms.has('VIEW_CHANNEL') || !perms.has('READ_MESSAGE_HISTORY'))) return false;
        }
        return true;
    });

    if (textChannels.length === 0) {
        throw new Error(`No accessible text channels found in server ${guild.name || guildId}.`);
    }

    let totalFetched = 0;
    let totalNew = 0;

    for (let i = 0; i < textChannels.length; i++) {
        const ch = textChannels[i];
        try {
            const res = await scrapeChannelBans(ch.id, maxMessagesPerChannel, async (prog) => {
                if (typeof onProgress === 'function') {
                    await onProgress({
                        fetchedCount: totalFetched + prog.fetchedCount,
                        maxMessages: textChannels.length * maxMessagesPerChannel,
                        newEntriesCount: totalNew + prog.newEntriesCount,
                        channelName: ch.name,
                        channelIndex: i + 1,
                        totalChannels: textChannels.length
                    });
                }
            });
            if (res) {
                totalFetched += res.fetchedCount || 0;
                totalNew += res.newEntriesCount || 0;
            }
        } catch (err) {
            const errCode = Number(err.code);
            const errMsg = String(err.message || err || '').toLowerCase();
            const isMissingAccess = errCode === 50001 || errCode === 50013 || errMsg.includes('missing access') || errMsg.includes('missing permissions');
            if (isMissingAccess) {
                console.log(`[Self-Bot] Skipped channel ${ch.name} (${ch.id}): Missing Access/Permissions`);
            } else {
                console.error(`[Self-Bot] Error scraping channel ${ch.name} (${ch.id}):`, err.message || err);
            }
        }
    }

    return { fetchedCount: totalFetched, newEntriesCount: totalNew, channelsScraped: textChannels.length };
}

const cheatCheckCache = new Map();
const CHEAT_CHECK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function checkUserCheatServers(discordId, mainClient = null, bypassCache = false) {
    if (!discordId) return [];

    const cleanId = String(discordId).replace(/^discord:/i, '').trim();
    if (!/^\d{17,20}$/.test(cleanId)) {
        console.warn(`[Cheat Server Check] Invalid Discord ID format: "${discordId}"`);
        return [];
    }
    const knownEmojis = ['1477451518042046566', '1477449996331651153'];
    if (knownEmojis.includes(cleanId)) {
        return [];
    }
    discordId = cleanId;

    if (!bypassCache && cheatCheckCache.has(discordId)) {
        const entry = cheatCheckCache.get(discordId);
        if (Date.now() - entry.timestamp < CHEAT_CHECK_CACHE_TTL) {
            console.log(`[Cheat Server Check] Returning cached result for user ${discordId} (${entry.data.length} detections)`);
            return entry.data;
        }
    }

    const cheatServersPath = path.join(__dirname, 'cheatServers.json');
    let cheatServers = [];
    try {
        if (fs.existsSync(cheatServersPath)) {
            cheatServers = JSON.parse(fs.readFileSync(cheatServersPath, 'utf8') || '[]');
        }
    } catch (e) {
        console.error('[Self-Bot] Failed to load cheatServers.json:', e);
        return [];
    }

    if (cheatServers.length === 0) return [];

    if (selfBotClient && !selfBotClient.isReady()) {
        console.log('[Cheat Server Check] Self-Bot is logging in... Waiting for ready state...');
        let waited = 0;
        while (selfBotClient && !selfBotClient.isReady() && waited < 30) {
            await new Promise(r => setTimeout(r, 100));
            waited++;
        }
    }

    console.log(`[Cheat Server Check] Checking ${cheatServers.length} cheat server(s) for user ${discordId}...`);
    if (selfBotClient && selfBotClient.isReady()) {
        console.log(`[Self-Bot Diagnostic] okacha474 is currently in ${selfBotClient.guilds.cache.size} server(s):`, selfBotClient.guilds.cache.map(g => `${g.name} [${g.id}]`).join(' | '));
    }

    // Diagnostic: Fetch target user profile and log mutual guild IDs
    let targetUserObj = null;
    let mutualGuildIds = [];
    if (selfBotClient && selfBotClient.isReady() && /^\d{17,20}$/.test(discordId)) {
        try {
            targetUserObj = await selfBotClient.users.fetch(discordId, { force: true }).catch(() => null);
            if (targetUserObj) {
                let profile = null;
                try {
                    if (typeof targetUserObj.fetchProfile === 'function') {
                        profile = await targetUserObj.fetchProfile().catch(() => null);
                    } else if (typeof selfBotClient.users.fetchProfile === 'function') {
                        profile = await selfBotClient.users.fetchProfile(discordId).catch(() => null);
                    }
                } catch (pErr) { }
                const mutualsMap = profile?.mutualGuilds || targetUserObj?.mutualGuilds;
                if (mutualsMap) {
                    if (typeof mutualsMap.keys === 'function') {
                        mutualGuildIds = Array.from(mutualsMap.keys());
                    } else if (typeof mutualsMap.map === 'function') {
                        mutualGuildIds = mutualsMap.map(g => g.id || g);
                    } else if (Array.isArray(mutualsMap)) {
                        mutualGuildIds = mutualsMap.map(g => g.id || g);
                    }
                }
                console.log(`[Self-Bot Diagnostic] User ${discordId} (${targetUserObj.username || targetUserObj.tag}) mutual guild IDs with okacha474:`, mutualGuildIds);
            }
        } catch (diagErr) {
            console.log(`[Self-Bot Diagnostic] Error checking mutual guilds:`, diagErr.message);
        }
    }

    const token = process.env.SELF_BOT_TOKEN;

    const checkPromises = cheatServers.map(async (server) => {
        try {
            const guildId = server.guildId;
            if (!guildId) return null;

            let isMember = false;
            let username = discordId;
            let userRoles = '';
            let guildName = server.guildName || `Server ${guildId}`;

            const selfGuild = selfBotClient?.guilds?.cache?.get(guildId);
            const mainGuild = mainClient?.guilds?.cache?.get(guildId);
            const targetGuild = selfGuild || mainGuild;

            let guildIconUrl = null;
            if (targetGuild) {
                guildName = targetGuild.name || guildName;
                try {
                    guildIconUrl = targetGuild.iconURL({ dynamic: true, size: 512 });
                } catch (e) { }
            }

            console.log(`[Cheat Server Check] Checking guild ${guildId} (${guildName}) | Self-Bot Joined: ${!!selfGuild} | Main Bot Joined: ${!!mainGuild}`);

            if (!selfGuild && !mainGuild) {
                console.warn(`[Cheat Server Check] ⚠️ WARNING: Self-Bot account (${selfBotClient?.user?.tag}) is NOT inside server ${guildId}! Make sure account okacha474 has joined server ${guildId}.`);
            }

            // Strategy 1: Immediate check against pre-fetched mutualGuildIds array
            if (!isMember && mutualGuildIds && mutualGuildIds.includes(guildId)) {
                isMember = true;
                if (targetUserObj) {
                    username = targetUserObj.globalName || targetUserObj.tag || targetUserObj.username || discordId;
                }
                console.log(`[Cheat Server Check] ✅ MATCH FOUND via mutualGuildIds for user ${discordId} in guild ${guildId}!`);
            }

            // Timeout wrapper helper to prevent stuck REST calls
            const withTimeout = (promise, ms = 3500) => Promise.race([
                promise,
                new Promise(r => setTimeout(() => r(null), ms))
            ]);

            // Strategy 2: Direct Guild Member Fetch & Gateway Search for Self-Bot
            if (!isMember && selfGuild) {
                try {
                    let member = selfGuild.members.cache.get(discordId)
                        || selfGuild.members.cache.find(m => m.id === discordId || m.user?.id === discordId);

                    // 1. Direct Member Fetch from Discord API by Discord ID Snowflake
                    if (!member) {
                        try {
                            member = await withTimeout(selfGuild.members.fetch(discordId).catch(() => null));
                        } catch (e) { }
                    }

                    // 2. Search by Target Username if direct ID fetch was null
                    if (!member && targetUserObj && targetUserObj.username) {
                        try {
                            const searched = await withTimeout(selfGuild.members.search({ query: targetUserObj.username, limit: 10 }).catch(() => null));
                            if (searched && searched.size > 0) {
                                member = searched.get(discordId) || searched.find(m => m.id === discordId || m.user?.id === discordId || m.user?.username?.toLowerCase() === targetUserObj.username.toLowerCase());
                            }
                        } catch (e) { }
                    }

                    console.log(`[Cheat Server Check] Guild ${guildId} (${guildName}) member check for ${discordId}: memberFound=${!!member}`);

                    if (member) {
                        isMember = true;
                        username = member.user?.tag || member.user?.username || member.displayName || username;
                        if (member.roles && member.roles.cache) {
                            userRoles = member.roles.cache
                                .filter(r => r.name !== '@everyone')
                                .map(r => r.name)
                                .join(', ');
                        }
                    }
                } catch (e) {
                    console.log(`[Cheat Server Check] Error checking selfGuild members:`, e.message);
                }
            }

            // Strategy 2.5: Raw HTTP REST API Member Fetch for Self-Bot Token
            if (!isMember && token && guildId) {
                try {
                    const rawMemberData = await withTimeout(
                        fetch(`https://discord.com/api/v9/guilds/${guildId}/members/${discordId}`, {
                            headers: { 'Authorization': token, 'Content-Type': 'application/json' }
                        }).then(r => r.ok ? r.json() : null).catch(() => null),
                        3000
                    );

                    if (rawMemberData && (rawMemberData.user || rawMemberData.roles)) {
                        isMember = true;
                        if (rawMemberData.user) {
                            username = rawMemberData.user.global_name || rawMemberData.user.username || rawMemberData.user.tag || username;
                        }
                        if (rawMemberData.roles && selfGuild) {
                            userRoles = rawMemberData.roles.map(rId => selfGuild.roles.cache.get(rId)?.name).filter(Boolean).join(', ');
                        }
                        console.log(`[Cheat Server Check] ✅ MATCH FOUND via Raw REST API for user ${discordId} in guild ${guildId}!`);
                    }
                } catch (e) { }
            }

            // Strategy 3: Main Bot Fallback
            if (!isMember && mainGuild) {
                try {
                    const member = mainGuild.members.cache.get(discordId) || await withTimeout(mainGuild.members.fetch(discordId).catch(() => null));
                    if (member) {
                        isMember = true;
                        username = member.user?.tag || member.user?.username || discordId;
                        if (member.roles && member.roles.cache) {
                            userRoles = member.roles.cache
                                .filter(r => r.name !== '@everyone')
                                .map(r => r.name)
                                .join(', ');
                        }
                    }
                } catch (e) { }
            }

            // Strategy 4: Fallback Username/Tag or Cache lookup in selfGuild
            if (!isMember && selfGuild && username && username !== discordId) {
                const matchedMember = selfGuild.members.cache.find(m =>
                    m.id === discordId ||
                    m.user?.id === discordId ||
                    (m.user?.username && m.user.username.toLowerCase() === username.toLowerCase()) ||
                    (m.user?.tag && m.user.tag.toLowerCase() === username.toLowerCase())
                );
                if (matchedMember) {
                    isMember = true;
                    if (matchedMember.roles && matchedMember.roles.cache) {
                        userRoles = matchedMember.roles.cache
                            .filter(r => r.name !== '@everyone')
                            .map(r => r.name)
                            .join(', ');
                    }
                }
            }

            // Extract Roles if member was detected via MutualGuilds
            if (isMember && selfGuild && !userRoles) {
                try {
                    const cachedMember = selfGuild.members.cache.get(discordId)
                        || await withTimeout(selfGuild.members.fetch(discordId).catch(() => null));

                    if (cachedMember && cachedMember.roles && cachedMember.roles.cache) {
                        userRoles = cachedMember.roles.cache
                            .filter(r => r.name !== '@everyone')
                            .map(r => r.name)
                            .join(', ');
                    }
                } catch (e) { }
            }

            console.log(`[Cheat Server Check] Result for user ${discordId} in guild ${guildId} (${guildName}): isMember=${isMember}`);

            if (isMember) {
                return {
                    identifiers: {
                        discord: `discord:${discordId}`,
                        license: 'Not Provided'
                    },
                    playerInfo: {
                        name: username
                    },
                    banDetails: {
                        reason: 'Member in Cheat Server',
                        roles: userRoles || 'Member',
                        serverName: guildName,
                        guildId: guildId,
                        guildIconUrl: guildIconUrl,
                        addedAt: new Date().toISOString()
                    }
                };
            }
        } catch (err) {
            console.error(`[Self-Bot] Error checking user ${discordId} in guild ${server.guildId}:`, err.message);
        }
        return null;
    });

    const results = await Promise.all(checkPromises);
    const detected = results.filter(Boolean);
    cheatCheckCache.set(discordId, { data: detected, timestamp: Date.now() });
    return detected;
}

module.exports = {
    initSelfBot,
    reloadMonitorChannels,
    scrapeChannelBans,
    scrapeGuildBans,
    checkUserCheatServers,
};

