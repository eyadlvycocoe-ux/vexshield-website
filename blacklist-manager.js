'use strict';

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    SectionBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const { hasBlacklistPermission, grantBlacklistPermission, revokeBlacklistPermission, listAllowedUsers } = require('./permission-manager');
const { addCheatServer, formatCheatServersList, loadCheatServers } = require('./cheat-servers-manager');
const { addMonitorChannel, removeMonitorChannel, getMonitoredChannels } = require('./channel-monitor-manager');
const { ensureGuildCustomEmojis } = require('./emoji-manager');
const { checkUserCheatServers } = require('./selfbot');

const blacklistFilePath = path.join(__dirname, 'blacklist.json');
const OWNER_ID = '1339366537085321257';
const TRUSTED_USERS = ['1339366537085321257', '1134674389254803456'];
const DEFAULT_LOGO_URL = 'https://zupimages.net/up/26/35/nltb.png';

const navigationState = new Map();
const pendingRequests = new Map();

let blacklistCache = null;
let blacklistCacheMtime = 0;

async function preloadBlacklistData() {
    try {
        if (!fs.existsSync(blacklistFilePath)) return [];
        const stats = await fs.promises.stat(blacklistFilePath);
        if (blacklistCache && stats.mtimeMs === blacklistCacheMtime) {
            return blacklistCache;
        }
        console.log('[Blacklist Cache] Pre-loading blacklist.json into memory asynchronously...');
        const raw = await fs.promises.readFile(blacklistFilePath, 'utf8');
        blacklistCache = JSON.parse(raw || '[]');
        blacklistCacheMtime = stats.mtimeMs;
        console.log(`[Blacklist Cache] Loaded ${blacklistCache.length} entries into memory.`);
        return blacklistCache;
    } catch (e) {
        console.error('[Blacklist Cache] Error pre-loading blacklist file:', e);
        return blacklistCache || [];
    }
}

// Trigger background pre-loading immediately upon requiring the module
preloadBlacklistData().catch(() => {});

let isSavingBlacklist = false;
let pendingSaveTimeout = null;

function getBlacklistData() {
    try {
        if (blacklistCache) {
            return blacklistCache;
        }
        if (!fs.existsSync(blacklistFilePath)) return [];
        console.log('[Blacklist Cache] Loading blacklist.json into memory...');
        const raw = fs.readFileSync(blacklistFilePath, 'utf8');
        blacklistCache = JSON.parse(raw || '[]');
        console.log(`[Blacklist Cache] Loaded ${blacklistCache.length} entries into memory.`);
        return blacklistCache;
    } catch (e) {
        console.error('[Blacklist Cache] Error reading blacklist file:', e);
        return blacklistCache || [];
    }
}

function saveBlacklistData(newData) {
    try {
        blacklistCache = newData;

        if (pendingSaveTimeout) {
            clearTimeout(pendingSaveTimeout);
        }

        pendingSaveTimeout = setTimeout(async () => {
            if (isSavingBlacklist) return;
            isSavingBlacklist = true;
            try {
                const jsonStr = JSON.stringify(blacklistCache);
                await fs.promises.writeFile(blacklistFilePath, jsonStr, 'utf8');
                console.log(`[Blacklist Cache] Asynchronously saved ${blacklistCache.length} entries (${(jsonStr.length / 1024 / 1024).toFixed(2)} MB) to disk.`);
            } catch (err) {
                console.error('[Blacklist Cache] Error saving blacklist file asynchronously:', err);
            } finally {
                isSavingBlacklist = false;
            }
        }, 1000);
    } catch (e) {
        console.error('[Blacklist Cache] Error updating in-memory blacklist data:', e);
    }
}

function buildProgressBar(current, total, barLength = 14) {
    const safeTotal = Math.max(1, total);
    const percentage = Math.min(1, Math.max(0, current / safeTotal));
    const filledLength = Math.round(barLength * percentage);
    const emptyLength = barLength - filledLength;
    const filledBar = '█'.repeat(filledLength);
    const emptyBar = '░'.repeat(emptyLength);
    const percentText = Math.round(percentage * 100);
    return `[\`${filledBar}${emptyBar}\`] **${percentText}%**`;
}

function buildAdminPanelContainer() {
    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# 🛡️ **AirShield Admin Control Panel**'),
            new TextDisplayBuilder().setContent('```diff\n+ Management & Control Hub for AirShield Anticheat Bot.\n```')
        )
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }));

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_add_cheat_server').setLabel('Add Cheat Server').setStyle(ButtonStyle.Primary).setEmoji('➕'),
        new ButtonBuilder().setCustomId('btn_list_cheat_servers').setLabel('List Cheat Servers').setStyle(ButtonStyle.Secondary).setEmoji('📋')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_grant_blacklist_perm').setLabel('Grant Perm').setStyle(ButtonStyle.Secondary).setEmoji('🔑'),
        new ButtonBuilder().setCustomId('btn_revoke_blacklist_perm').setLabel('Revoke Perm').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('btn_list_blacklist_perms').setLabel('List Perms').setStyle(ButtonStyle.Secondary).setEmoji('👥')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_add_monitor_channel').setLabel('Add Channel').setStyle(ButtonStyle.Secondary).setEmoji('📡'),
        new ButtonBuilder().setCustomId('btn_remove_monitor_channel').setLabel('Remove Channel').setStyle(ButtonStyle.Secondary).setEmoji('🗑️'),
        new ButtonBuilder().setCustomId('btn_list_monitor_channels').setLabel('List Channels').setStyle(ButtonStyle.Secondary).setEmoji('📋')
    );

    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_extract_channel_bans').setLabel('Extract Channel Bans').setStyle(ButtonStyle.Danger).setEmoji('🔍')
    );

    const container = new ContainerBuilder()
        .setAccentColor(0x393A41)
        .addSectionComponents(titleSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Click any button below to manage features, extract bans, or open modal forms:')
        )
        .addActionRowComponents(row1, row2, row3, row4);

    return container;
}

function buildBlacklistContainer(userBans, currentIndex, userAvatarUrl, customEmojis = {}, cheatServersCount = 0) {
    const banData = userBans[currentIndex] || {};
    const identifiers = banData.identifiers || {};
    const playerInfo = banData.playerInfo || {};
    const banDetails = banData.banDetails || {};

    const rawDiscord = identifiers.discord || banData.discord || banData.discord_id || banData.userId || banData.id;
    const discordId = rawDiscord ? String(rawDiscord).replace(/^discord:/, '') : null;
    const totalBans = userBans.length;

    const username = playerInfo.name || banData.name || banData.username || banData.user || 'Unknown';
    let reason = banDetails.reason || banData.reason || banData.ban_reason || 'No reason';
    let rolesVal = banDetails.roles || banData.roles || '';

    if (reason.includes('(Roles:')) {
        const match = reason.match(/\(Roles:\s*([^)]+)\)/);
        if (match) rolesVal = match[1];
        reason = reason.replace(/\s*\(Roles:[^)]+\)/, '').replace(/\s*\([^)]+\)/g, '').trim();
    }
    if (reason.includes('(')) {
        reason = reason.replace(/\s*\([^)]+\)/g, '').trim();
    }

    const license = identifiers.license || banData.license || banData.license_key || 'Unknown';
    const serverName = banDetails.serverName || banData.serverName || banData.server || banData.guild || 'Unknown';

    const eUser = customEmojis.user || customEmojis.whitemember || customEmojis.member || '';
    const eUsername = customEmojis.username || customEmojis.verified || '';
    const eReason = customEmojis.reason || customEmojis.tools || '';
    const eRoles = customEmojis.roles || customEmojis.badge || customEmojis.whitemember || customEmojis.tools || '';
    const eLicense = customEmojis.license || customEmojis.admin || '';
    const eServer = customEmojis.server || customEmojis.house || '';
    const eTime = customEmojis.time || customEmojis.stopwatch || '';
    const eTitle = customEmojis.title || customEmojis.ban || '';

    const formatLine = (emoji, label, val) => {
        const prefix = emoji ? `${emoji} \`|\` ` : '';
        return `${prefix}**${label}** ${val}`;
    };

    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${eTitle ? `${eTitle} ` : '♻️ '}**Blacklist Live** (${currentIndex + 1}/${totalBans})`),
            new TextDisplayBuilder().setContent('```diff\n- A new user has been added to the global blacklist.\n```'),
            new TextDisplayBuilder().setContent('```diff\n- If you were blacklisted by mistake or have any issues, please open a ticket and we will resolve it with you.\n```')
        )
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatarUrl || DEFAULT_LOGO_URL } }));

    const userInfo1 = new TextDisplayBuilder().setContent(formatLine(eUser, 'User ID', discordId ? `<@${discordId}>` : '`no linked`'));
    const userInfo2 = new TextDisplayBuilder().setContent(formatLine(eUsername, 'Username', `\`${username}\``));
    const userInfo3 = new TextDisplayBuilder().setContent(formatLine(eReason, 'Reason', `\`${reason}\``));
    const cardComponents = [userInfo1, userInfo2, userInfo3];

    if (rolesVal) {
        cardComponents.push(new TextDisplayBuilder().setContent(formatLine(eRoles, 'Roles', `\`${rolesVal}\``)));
    }

    cardComponents.push(
        new TextDisplayBuilder().setContent(formatLine(eLicense, 'License', `\`${license}\``)),
        new TextDisplayBuilder().setContent(formatLine(eServer, 'Server', `\`${serverName}\``))
    );

    const screenshotUrls = banDetails.screenshotUrls || banData.screenshotUrls || (banDetails.screenshotUrl && banDetails.screenshotUrl !== 'no-image' ? [banDetails.screenshotUrl] : (banData.screenshotUrl && banData.screenshotUrl !== 'no-image' ? [banData.screenshotUrl] : []));
    const videoUrls = banDetails.videoUrls || banData.videoUrls || (banDetails.videoUrl && banDetails.videoUrl !== 'no-video' ? [banDetails.videoUrl] : (banData.videoUrl && banData.videoUrl !== 'no-video' ? [banData.videoUrl] : []));

    let mediaGallery = null;
    let hasMedia = false;
    if (screenshotUrls.length > 0 || videoUrls.length > 0) {
        mediaGallery = new MediaGalleryBuilder();
        for (const url of screenshotUrls) {
            if (url && typeof url === 'string' && url.startsWith('http')) {
                mediaGallery.addItems(new MediaGalleryItemBuilder().setURL(url));
                hasMedia = true;
            }
        }
        for (const url of videoUrls) {
            if (url && typeof url === 'string' && url.startsWith('http')) {
                mediaGallery.addItems(new MediaGalleryItemBuilder().setURL(url));
                hasMedia = true;
            }
        }
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x393A41)
        .addSectionComponents(titleSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(...cardComponents);

    if (hasMedia && mediaGallery) {
        container.addMediaGalleryComponents(mediaGallery);
    }

    container._videoUrls = videoUrls;

    const rawDateVal = banDetails.addedAt || banData.addedAt || banData.date || banData.time || banData.created_at;
    const rawDate = rawDateVal ? new Date(rawDateVal).getTime() : Date.now();
    const addedAtTimestamp = Math.floor((isNaN(rawDate) ? Date.now() : rawDate) / 1000);
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(formatLine(eTime, 'Time', `<t:${addedAtTimestamp}:R>`))
        );

    const btnPrev = new ButtonBuilder()
        .setCustomId('nav_prev')
        .setEmoji('<:cursoralaizquierda1:1503771797772963971>')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentIndex === 0);

    const btnRefresh = new ButtonBuilder()
        .setCustomId('nav_refresh')
        .setEmoji('<:bigdata3:1474850317064736840>')
        .setStyle(ButtonStyle.Secondary);

    const btnNext = new ButtonBuilder()
        .setCustomId('nav_next')
        .setEmoji('<:cursoralaizquierda2:1503771850759602176>')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentIndex === totalBans - 1);

    const navigationButtons = new ActionRowBuilder().addComponents(btnPrev, btnRefresh, btnNext);

    if (cheatServersCount > 0 && discordId) {
        const btnCheat = new ButtonBuilder()
            .setCustomId(`btn_view_cheat_servers_${discordId}`)
            .setLabel(`Joined (${cheatServersCount}) - Click to see`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🌐');

        navigationButtons.addComponents(btnCheat);
    }

    container.addActionRowComponents(navigationButtons);

    return container;
}

function buildCheatServerContainer(cheatDetections, currentIndex, userAvatarUrl, customEmojis, targetDiscordId) {
    const det = cheatDetections[currentIndex] || cheatDetections[0] || {};
    const totalCount = cheatDetections.length;

    const eUser = customEmojis.user || customEmojis.whitemember || customEmojis.member || '';
    const eUsername = customEmojis.username || customEmojis.verified || '';
    const eReason = customEmojis.reason || customEmojis.tools || '';
    const eRoles = customEmojis.roles || customEmojis.badge || customEmojis.whitemember || customEmojis.tools || '';
    const eLicense = customEmojis.license || customEmojis.admin || '';
    const eServer = customEmojis.server || customEmojis.house || '';
    const eTime = customEmojis.time || customEmojis.stopwatch || '';
    const eTitle = customEmojis.title || customEmojis.ban || '';

    const formatLine = (emoji, label, val) => {
        const prefix = emoji ? `${emoji} \`|\` ` : '';
        return `${prefix}**${label}** ${val}`;
    };

    const sName = det.banDetails?.serverName || det.serverName || 'Unknown Server';
    let rText = det.banDetails?.reason || det.reason || 'Member in Cheat Server';
    let rolesVal = det.banDetails?.roles || det.roles || '';

    if (rText.includes('(Roles:')) {
        const match = rText.match(/\(Roles:\s*([^)]+)\)/);
        if (match) rolesVal = match[1];
        rText = rText.replace(/\s*\(Roles:[^)]+\)/, '').replace(/\s*\([^)]+\)/g, '').trim();
    }
    if (rText.includes('(')) {
        rText = rText.replace(/\s*\([^)]+\)/g, '').trim();
    }

    if (!rolesVal) rolesVal = 'Member';
    if (!rText) rText = 'Member in Cheat Server';

    const usernameVal = det.playerInfo?.name || det.name || targetDiscordId;

    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${eTitle ? `${eTitle} ` : '🌐 '}**Cheat Server Member** (${currentIndex + 1}/${totalCount})`),
            new TextDisplayBuilder().setContent('```diff\n- User detected inside active cheat / leak servers.\n```'),
            new TextDisplayBuilder().setContent('```diff\n- This detection is live from registered cheat server monitoring.\n```')
        )
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatarUrl || DEFAULT_LOGO_URL } }));

    const text1 = new TextDisplayBuilder().setContent(
        `${formatLine(eUser, 'User ID', `<@${targetDiscordId}>`)}\n${formatLine(eUsername, 'Username', `\`${usernameVal}\``)}`
    );
    const text2 = new TextDisplayBuilder().setContent(
        `${formatLine(eReason, 'Reason', `\`${rText}\``)}\n${formatLine(eRoles, 'Roles', `\`${rolesVal}\``)}`
    );
    const text3 = new TextDisplayBuilder().setContent(
        `${formatLine(eLicense, 'License', '`Not Provided`')}\n${formatLine(eServer, 'Server', `\`${sName}\``)}`
    );

    const infoSection = new SectionBuilder()
        .addTextDisplayComponents(text1, text2, text3);

    const guildIconUrl = det.banDetails?.guildIconUrl || det.guildIconUrl;
    if (guildIconUrl && typeof guildIconUrl === 'string' && guildIconUrl.startsWith('http')) {
        infoSection.setThumbnailAccessory(new ThumbnailBuilder({ media: { url: guildIconUrl } }));
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x393A41)
        .addSectionComponents(titleSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addSectionComponents(infoSection);

    const rawDateVal = det.banDetails?.addedAt || det.addedAt;
    const rawDate = rawDateVal ? new Date(rawDateVal).getTime() : Date.now();
    const addedAtTimestamp = Math.floor((isNaN(rawDate) ? Date.now() : rawDate) / 1000);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(formatLine(eTime, 'Time', `<t:${addedAtTimestamp}:R>`))
        );

    if (totalCount > 1) {
        const btnPrev = new ButtonBuilder()
            .setCustomId(`csnav_prev_${targetDiscordId}_${currentIndex}`)
            .setEmoji('<:cursoralaizquierda1:1503771797772963971>')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentIndex === 0);

        const btnRefresh = new ButtonBuilder()
            .setCustomId(`csnav_refresh_${targetDiscordId}_${currentIndex}`)
            .setEmoji('<:bigdata3:1474850317064736840>')
            .setStyle(ButtonStyle.Secondary);

        const btnNext = new ButtonBuilder()
            .setCustomId(`csnav_next_${targetDiscordId}_${currentIndex}`)
            .setEmoji('<:cursoralaizquierda2:1503771850759602176>')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentIndex === totalCount - 1);

        const navRow = new ActionRowBuilder().addComponents(btnPrev, btnRefresh, btnNext);
        container.addActionRowComponents(navRow);
    }

    return container;
}

async function sendGlobalBlacklistLog(client, banData) {
    try {
        const channelId = '1505688462915932321';
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.error(`[Discord Bot] Channel ${channelId} not found.`);
            return;
        }

        const { identifiers } = banData;
        const discordId = identifiers.discord ? identifiers.discord.replace('discord:', '') : null;

        let userAvatarUrl = DEFAULT_LOGO_URL;
        if (discordId) {
            try {
                const user = await client.users.fetch(discordId);
                userAvatarUrl = user.displayAvatarURL({ dynamic: true, size: 512 });
            } catch (e) {
                console.error('[Discord Bot] Failed to fetch user avatar:', e);
            }
        }

        let blacklist = [];
        if (fs.existsSync(blacklistFilePath)) {
            blacklist = JSON.parse(fs.readFileSync(blacklistFilePath, 'utf8') || '[]');
        }
        const userBans = blacklist.filter(b => {
            if (identifiers.license && identifiers.license !== 'Not Provided' && b.identifiers.license === identifiers.license) {
                return true;
            }
            if (identifiers.discord && b.identifiers.discord === identifiers.discord) {
                return true;
            }
            return false;
        });

        const currentIndex = userBans.findIndex(b =>
            b.banDetails.addedAt === banData.banDetails.addedAt
        ) !== -1 ? userBans.findIndex(b => b.banDetails.addedAt === banData.banDetails.addedAt) : userBans.length - 1;

        const container = buildBlacklistContainer(userBans, currentIndex, userAvatarUrl);

        const message = await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

        navigationState.set(message.id, {
            userBans,
            currentIndex,
            userAvatarUrl
        });

        console.log(`[Discord Bot] Global Blacklist log sent for ${banData.playerInfo.name}`);
    } catch (error) {
        console.error('[Discord Bot] Failed to send Global Blacklist log:', error);
    }
}

async function sendBlacklistApprovalRequest(client, banData) {
    try {
        const channelId = '1503503062961229884';
        const channel = await client.channels.fetch(channelId);
        if (!channel) return console.error(`[Discord Bot] Approval channel ${channelId} not found.`);

        const requestId = Date.now().toString();
        pendingRequests.set(requestId, banData);

        const { identifiers, playerInfo, banDetails } = banData;
        const discordId = identifiers.discord ? identifiers.discord.replace('discord:', '') : null;

        let userAvatarUrl = DEFAULT_LOGO_URL;
        if (discordId) {
            try {
                const user = await client.users.fetch(discordId);
                userAvatarUrl = user.displayAvatarURL({ dynamic: true, size: 512 });
            } catch (e) {
                console.error('[Discord Bot] Failed to fetch user avatar:', e);
            }
        }

        const titleSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# ♻️ **Blacklist Approval Request**'),
                new TextDisplayBuilder().setContent('```diff\n- A new blacklist report requires your review.\n```')
            )
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatarUrl } }));

        const userInfo1 = new TextDisplayBuilder().setContent(`<:calendarclock2:1477450748290662400> \`|\` **User ID** ${discordId ? `<@${discordId}>` : '`no linked`'}`);
        const userInfo2 = new TextDisplayBuilder().setContent(`<:key1:1477451518042046566> \`|\` **Username** \`${playerInfo.name || 'Unknown'}\``);
        const userInfo3 = new TextDisplayBuilder().setContent(`<:fingerprintidentification6:1474878496265212044> \`|\` **Reason** \`${banDetails.reason || 'No reason'}\``);
        const userInfo4 = new TextDisplayBuilder().setContent(`<:calendarclock3:1477451029556494346> \`|\` **License** \`${identifiers.license || 'Unknown'}\``);
        const userInfo5 = new TextDisplayBuilder().setContent(`<:fingerprintidentification4:1474863488412287109> \`|\` **Server** \`${banDetails.serverName || 'Unknown'}\``);

        const screenshotUrls = banDetails.screenshotUrls || (banDetails.screenshotUrl && banDetails.screenshotUrl !== 'no-image' ? [banDetails.screenshotUrl] : []);
        const videoUrls = banDetails.videoUrls || (banDetails.videoUrl && banDetails.videoUrl !== 'no-video' ? [banDetails.videoUrl] : []);

        let mediaGallery = null;
        if (screenshotUrls.length > 0 || videoUrls.length > 0) {
            mediaGallery = new MediaGalleryBuilder();
            for (const url of screenshotUrls) {
                mediaGallery.addItems(new MediaGalleryItemBuilder().setURL(url));
            }
            for (const url of videoUrls) {
                mediaGallery.addItems(new MediaGalleryItemBuilder().setURL(url));
            }
        }

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_${requestId}`)
                    .setLabel('Accept')
                    .setEmoji('<:key1:1477451518042046566>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`reject_${requestId}`)
                    .setLabel('Reject')
                    .setEmoji('<:key1:1477451518042046566>')
                    .setStyle(ButtonStyle.Secondary)
            );

        const container = new ContainerBuilder()
            .setAccentColor(0x393A41)
            .addSectionComponents(titleSection)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(userInfo1, userInfo2, userInfo3, userInfo4, userInfo5);

        if (mediaGallery) {
            container.addMediaGalleryComponents(mediaGallery);
        }

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<:calendarclock1:1477449996331651153> \`|\` **Time** <t:${Math.floor(Date.now() / 1000)}:R>`)
            )
            .addActionRowComponents(actionButtons);

        await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

    } catch (error) {
        console.error('[Discord Bot] Failed to send approval request:', error);
    }
}

async function handleBlacklistInteraction(client, interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'blacklistadd') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }
                const user = interaction.options.getUser('discord');
                if (!user) {
                    await interaction.editReply({ content: '❌ Invalid user provided or user not found.' }).catch(() => {});
                    return true;
                }
                const discordId = user.id;
                const license = interaction.options.getString('license') || 'Not Provided';
                const reason = interaction.options.getString('reason') || 'Security Breach';
                const steam = interaction.options.getString('steam');
                const screenshot = interaction.options.getAttachment('screenshot');
                const videoUrl = interaction.options.getString('video');
                const serverName = interaction.options.getString('server') || (interaction.guild ? interaction.guild.name : 'Unknown Server');

                const banData = {
                    identifiers: {
                        license: license,
                        steam: steam || 'no linked',
                        discord: `discord:${discordId}`
                    },
                    playerInfo: {
                        name: discordId,
                        ip: 'Hidden'
                    },
                    banDetails: {
                        reason: reason,
                        serverName: serverName,
                        channelId: interaction.channelId,
                        channelName: interaction.channel ? interaction.channel.name : 'Unknown',
                        screenshotUrls: screenshot ? [screenshot.url] : [],
                        videoUrls: videoUrl ? [videoUrl] : [],
                        addedAt: new Date().toISOString(),
                        type: 'Global'
                    }
                };

                let blacklist = getBlacklistData();

                const isPermitted = hasBlacklistPermission(interaction.user.id, OWNER_ID, TRUSTED_USERS);
                const trustedChannels = process.env.TRUSTED_CHANNELS ? process.env.TRUSTED_CHANNELS.split(',').map(id => id.trim()) : [];
                const isTrustedChannel = trustedChannels.includes(interaction.channelId);

                if (isPermitted || isTrustedChannel) {
                    blacklist.push(banData);
                    saveBlacklistData(blacklist);

                    await sendGlobalBlacklistLog(client, banData);

                    const successContainer = new ContainerBuilder()
                        .setAccentColor(0x393A41)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent('# ✅ Success!')
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                        );

                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [successContainer]
                    });
                } else {
                    await sendBlacklistApprovalRequest(client, banData);

                    const pendingContainer = new ContainerBuilder()
                        .setAccentColor(0x393A41)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent('# ⏳ Pending Approval')
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                        );

                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [pendingContainer]
                    });
                }
            } catch (error) {
                console.error('[Discord Bot] Error adding to manual blacklist:', error);
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0x393A41)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('# ❌ Error!')
                            )
                            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                    );

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [errorContainer]
                    }).catch(() => {});
                } else {
                    await interaction.reply({
                        content: `❌ **Error**: ${error.message}`,
                        flags: [MessageFlags.Ephemeral]
                    }).catch(() => {});
                }
            }
            return true;
        } else if (commandName === 'clear') {
            try {
                if (interaction.user.id !== OWNER_ID && !TRUSTED_USERS.includes(interaction.user.id)) {
                    await interaction.reply({
                        content: '❌ You are not authorized to use this command.',
                        flags: [MessageFlags.Ephemeral]
                    }).catch(() => {});
                    return true;
                }
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }
                const user = interaction.options.getUser('discord');
                if (!user) {
                    await interaction.editReply({ content: '❌ Invalid user provided or user not found.' }).catch(() => {});
                    return true;
                }
                const discordId = user.id;
                const targetDiscord = `discord:${discordId}`;

                let blacklist = getBlacklistData();
                const originalLength = blacklist.length;
                blacklist = blacklist.filter(entry => entry && entry.identifiers && entry.identifiers.discord !== targetDiscord && entry.identifiers.discord !== discordId && entry.identifiers.discord !== `discord:${discordId}`);
                const removedCount = originalLength - blacklist.length;

                saveBlacklistData(blacklist);

                const diffBlock = '```diff\n- Removed: ' + removedCount + ' entries for user <@' + discordId + '>\n```';
                const completeContainer = new ContainerBuilder()
                    .setAccentColor(0x393A41)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('# ✅ Clear complete!'),
                                new TextDisplayBuilder().setContent(diffBlock)
                            )
                            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                    );

                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [completeContainer]
                });
            } catch (error) {
                console.error('[Discord Bot] Error during clear:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: `❌ Error: ${error.message}` }).catch(() => {});
                } else {
                    await interaction.reply({ content: `❌ Error: ${error.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }
            }
            return true;
        } else if (commandName === 'checkuser') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply().catch(() => {});
                }
                const user = interaction.options.getUser('discord');
                if (!user) {
                    await interaction.editReply({ content: '❌ Invalid user provided or user not found.' }).catch(() => {});
                    return true;
                }
                const discordId = user.id;
                const targetDiscord = `discord:${discordId}`;

                const blacklist = getBlacklistData();
                const realBans = blacklist.filter(b =>
                    b && (
                        (b.identifiers && (
                            b.identifiers.discord === `discord:${discordId}` ||
                            b.identifiers.discord === discordId ||
                            (typeof b.identifiers.discord === 'string' && b.identifiers.discord.includes(discordId))
                        )) ||
                        b.userId === discordId ||
                        b.discord_id === discordId ||
                        b.id === discordId
                    )
                );

                let cheatDetections = [];
                try {
                    cheatDetections = await checkUserCheatServers(discordId, interaction.client);
                } catch (e) {
                    console.error('[Discord Bot] Error in checkUserCheatServers:', e.message);
                }

                let userAvatarUrl = DEFAULT_LOGO_URL;
                try {
                    const fetchedUser = await client.users.fetch(discordId);
                    userAvatarUrl = fetchedUser.displayAvatarURL({ dynamic: true, size: 512 });
                } catch (e) {
                    console.error('[Discord Bot] Failed to fetch user avatar:', e);
                }

                const customEmojis = interaction.guild ? await ensureGuildCustomEmojis(interaction.guild) : {};

                // CASE 1: User has REAL Blacklist Bans in database / json
                if (realBans.length > 0) {
                    const container = buildBlacklistContainer(realBans, 0, userAvatarUrl, customEmojis, cheatDetections.length);
                    const message = await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [container],
                        fetchReply: true
                    });

                    navigationState.set(message.id, {
                        userBans: realBans,
                        currentIndex: 0,
                        userAvatarUrl,
                        userId: interaction.user.id
                    });
                    return true;
                }

                // CASE 2: User is NOT in Blacklist, BUT IS IN CHEAT SERVERS!
                if (cheatDetections.length > 0) {
                    const notInBlacklistContainer = new ContainerBuilder()
                        .setAccentColor(0x393A41)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent('# ❌ No Blacklist Found'),
                                    new TextDisplayBuilder().setContent(`\`\`\`diff\n- This user is clean in the global blacklist.\n+ Detected inside ${cheatDetections.length} cheat server(s).\n\`\`\``)
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatarUrl || DEFAULT_LOGO_URL } }))
                        );

                    const btnCheat = new ButtonBuilder()
                        .setCustomId(`btn_view_cheat_servers_${discordId}`)
                        .setLabel(`Joined (${cheatDetections.length}) - Click to see`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🌐');

                    const actionRow = new ActionRowBuilder().addComponents(btnCheat);
                    notInBlacklistContainer.addActionRowComponents(actionRow);

                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [notInBlacklistContainer]
                    });
                    return true;
                }

                // CASE 3: User is NEITHER in Blacklist NOR in Cheat Servers
                const notFoundContainer = new ContainerBuilder()
                    .setAccentColor(0x393A41)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('# ❌ No Blacklist Found'),
                                new TextDisplayBuilder().setContent('```diff\n- This user is not in the blacklist.\n```')
                            )
                            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatarUrl || DEFAULT_LOGO_URL } }))
                    );

                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [notFoundContainer]
                });
                return true;
            } catch (error) {
                console.error('[Discord Bot] Error during checkuser:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        content: `❌ **Error during checkuser**: \`${error.message}\``,
                        flags: [],
                        components: []
                    }).catch(() => { });
                } else {
                    await interaction.reply({
                        content: `❌ **Error during checkuser**: \`${error.message}\``,
                        flags: [MessageFlags.Ephemeral]
                    }).catch(() => { });
                }
            }
            return true;
        } else if (commandName === 'adminpanel') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (err) {
                console.error('[Discord Bot] Failed to defer adminpanel interaction:', err.message);
                return true;
            }

            if (!interaction.deferred && !interaction.replied) return true;

            if (interaction.user.id !== OWNER_ID && !TRUSTED_USERS.includes(interaction.user.id)) {
                await interaction.editReply({ content: '❌ Only Bot Owner or Authorized Admins can open the Admin Panel.' }).catch(() => {});
                return true;
            }

            const container = buildAdminPanelContainer();
            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            }).catch(err => console.error('[Discord Bot] Error editing adminpanel reply:', err.message));
            return true;
        }
    } else if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId === 'btn_add_cheat_server') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_cheat_server')
                .setTitle('Add Cheat Server ID')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_server_id')
                            .setLabel('Server / Guild ID')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter Discord Server ID (e.g. 1352399778134229093)')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal).catch(err => console.error('[Discord Bot] Error showing add_cheat_server modal:', err.message));
            return true;
        } else if (customId === 'btn_list_cheat_servers') {
            const listFormatted = formatCheatServersList();
            await interaction.reply({ content: `📋 **Cheat Servers List**:\n${listFormatted}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            return true;
        } else if (customId === 'btn_grant_blacklist_perm') {
            const modal = new ModalBuilder()
                .setCustomId('modal_grant_perm')
                .setTitle('Grant Blacklist Permission')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_user_id')
                            .setLabel('User ID to Grant Permission')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal).catch(err => console.error('[Discord Bot] Error showing grant_perm modal:', err.message));
            return true;
        } else if (customId === 'btn_revoke_blacklist_perm') {
            const modal = new ModalBuilder()
                .setCustomId('modal_revoke_perm')
                .setTitle('Revoke Blacklist Permission')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_user_id')
                            .setLabel('User ID to Revoke Permission')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal).catch(err => console.error('[Discord Bot] Error showing revoke_perm modal:', err.message));
            return true;
        } else if (customId === 'btn_list_blacklist_perms') {
            const users = listAllowedUsers();
            if (users.length === 0) {
                await interaction.reply({ content: 'ℹ️ No custom users have been granted blacklist permission.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                return true;
            }
            const formatted = users.map((u, i) => `${i + 1}. <@${u.id}> (\`${u.id}\`) - Granted: <t:${Math.floor(new Date(u.grantedAt).getTime() / 1000)}:R>`).join('\n');
            await interaction.reply({ content: `📋 **Users Authorized for Blacklist Add**:\n${formatted}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            return true;
        } else if (customId === 'btn_add_monitor_channel') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_channel')
                .setTitle('Add Monitor Channel')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_channel_id')
                            .setLabel('Channel ID to Monitor')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal).catch(err => console.error('[Discord Bot] Error showing add_channel modal:', err.message));
            return true;
        } else if (customId === 'btn_remove_monitor_channel') {
            const modal = new ModalBuilder()
                .setCustomId('modal_remove_channel')
                .setTitle('Remove Monitor Channel')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_channel_id')
                            .setLabel('Channel ID to Remove')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal).catch(err => console.error('[Discord Bot] Error showing remove_channel modal:', err.message));
            return true;
        } else if (customId === 'btn_list_monitor_channels') {
            const channels = getMonitoredChannels();
            const monitorText = channels.length ? channels.map(c => `- <#${c}> (\`${c}\`)`).join('\n') : 'No channels monitored.';
            await interaction.reply({ content: `📡 **Monitored Channels List**:\n${monitorText}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            return true;
        } else if (customId === 'btn_extract_channel_bans') {
            const modal = new ModalBuilder()
                .setCustomId('modal_extract_channel_bans')
                .setTitle('Extract All Cheater Bans')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_server_id')
                            .setLabel('Server / Guild ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_channel_id')
                            .setLabel('Ban Log Channel ID (Optional)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('input_max_messages')
                            .setLabel('Max Messages to Scrape (Default: 200)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    )
                );
            await interaction.showModal(modal).catch(err => console.error('[Discord Bot] Error showing extract_bans modal:', err.message));
            return true;
        } else if (customId.startsWith('btn_view_cheat_servers_')) {
            const targetDiscordId = customId.replace('btn_view_cheat_servers_', '');
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => { });

            try {
                const cheatDetections = await checkUserCheatServers(targetDiscordId, interaction.client);
                if (!cheatDetections || cheatDetections.length === 0) {
                    await interaction.editReply({ content: `ℹ️ User <@${targetDiscordId}> is currently not detected in any registered cheat servers.` });
                    return true;
                }

                let userAvatarUrl = DEFAULT_LOGO_URL;
                try {
                    const u = await interaction.client.users.fetch(targetDiscordId);
                    if (u) userAvatarUrl = u.displayAvatarURL({ dynamic: true, size: 512 });
                } catch (e) { }

                const customEmojis = interaction.guild ? await ensureGuildCustomEmojis(interaction.guild) : {};
                const container = buildCheatServerContainer(cheatDetections, 0, userAvatarUrl, customEmojis, targetDiscordId);

                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                });

                const msg = await interaction.fetchReply().catch(() => null);
                if (msg && msg.id) {
                    navigationState.set(msg.id, {
                        type: 'cheat_servers',
                        cheatDetections,
                        currentIndex: 0,
                        userAvatarUrl,
                        targetDiscordId,
                        userId: interaction.user.id
                    });
                }
            } catch (err) {
                console.error('[Cheat Server Button Error]:', err);
                await interaction.editReply({ content: `❌ Error checking cheat servers: ${err.message}` });
            }
            return true;
        } else if (customId.startsWith('csnav_')) {
            await interaction.deferUpdate().catch(() => { });
            try {
                const parts = customId.split('_');
                const action = parts[1];
                const targetDiscordId = parts[2];
                let currentIndex = parseInt(parts[3] || '0', 10);

                let navState = navigationState.get(interaction.message?.id);

                if (navState && navState.userId && interaction.user.id !== navState.userId) {
                    await interaction.reply({ content: '❌ Only the person who used the command can use these buttons.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
                    return true;
                }

                let cheatDetections = navState?.cheatDetections;
                let userAvatarUrl = navState?.userAvatarUrl || DEFAULT_LOGO_URL;

                if (!cheatDetections || action === 'refresh') {
                    const bypassCache = (action === 'refresh');
                    cheatDetections = await checkUserCheatServers(targetDiscordId, interaction.client, bypassCache);
                }

                if (!cheatDetections || cheatDetections.length === 0) return true;

                if (action === 'prev') {
                    currentIndex = Math.max(0, currentIndex - 1);
                } else if (action === 'next') {
                    currentIndex = Math.min(cheatDetections.length - 1, currentIndex + 1);
                } else if (action === 'refresh') {
                    currentIndex = 0;
                }

                if (!userAvatarUrl || userAvatarUrl === DEFAULT_LOGO_URL) {
                    try {
                        const u = await interaction.client.users.fetch(targetDiscordId);
                        if (u) userAvatarUrl = u.displayAvatarURL({ dynamic: true, size: 512 });
                    } catch (e) { }
                }

                const customEmojis = interaction.guild ? await ensureGuildCustomEmojis(interaction.guild) : {};
                const container = buildCheatServerContainer(cheatDetections, currentIndex, userAvatarUrl, customEmojis, targetDiscordId);

                if (navState) {
                    navState.currentIndex = currentIndex;
                    navState.cheatDetections = cheatDetections;
                    navState.userAvatarUrl = userAvatarUrl;
                } else if (interaction.message?.id) {
                    navState = {
                        type: 'cheat_servers',
                        cheatDetections,
                        currentIndex,
                        userAvatarUrl,
                        targetDiscordId,
                        userId: interaction.user.id
                    };
                    navigationState.set(interaction.message.id, navState);
                }

                const navResponse = {
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                };

                await interaction.editReply(navResponse).catch(async (err) => {
                    await interaction.update(navResponse).catch(() => {});
                });
            } catch (err) {
                console.error('[Cheat Server Nav Error]:', err);
            }
            return true;
        } else if (customId.startsWith('nav_')) {
            await interaction.deferUpdate().catch(() => {});
            try {
                let navState = navigationState.get(interaction.message?.id);

                if (navState && navState.userId && interaction.user.id !== navState.userId) {
                    await interaction.reply({ content: '❌ Only the person who used the command can use these buttons.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
                    return true;
                }

                let userAvatarUrl = navState?.userAvatarUrl || DEFAULT_LOGO_URL;
                let userBans = navState?.userBans || [];
                let currentIndex = navState?.currentIndex || 0;

                if (!navState || !userBans || userBans.length === 0) {
                    const blacklist = getBlacklistData();
                    let targetDiscordId = null;
                    try {
                        const rawContent = JSON.stringify(interaction.message?.components || []);
                        const userMentionMatch = rawContent.match(/<@!?(\d{17,20})>/);
                        if (userMentionMatch) {
                            targetDiscordId = userMentionMatch[1];
                        } else {
                            const knownEmojis = ['1477451518042046566', '1477449996331651153'];
                            const allMatches = rawContent.match(/\d{17,20}/g) || [];
                            const validUserMatch = allMatches.find(id => !knownEmojis.includes(id));
                            if (validUserMatch) targetDiscordId = validUserMatch;
                        }
                    } catch (e) { }

                    if (targetDiscordId) {
                        userBans = blacklist.filter(b =>
                            b && (
                                (b.identifiers && (
                                    b.identifiers.discord === `discord:${targetDiscordId}` ||
                                    b.identifiers.discord === targetDiscordId ||
                                    (typeof b.identifiers.discord === 'string' && b.identifiers.discord.includes(targetDiscordId))
                                )) ||
                                b.userId === targetDiscordId ||
                                b.discord_id === targetDiscordId ||
                                b.id === targetDiscordId
                            )
                        );

                        try {
                            const cheatDetections = await checkUserCheatServers(targetDiscordId, interaction.client);
                            for (const det of cheatDetections) {
                                userBans.unshift(det);
                            }
                        } catch (e) { }
                    }

                    if (!userBans || userBans.length === 0) {
                        userBans = blacklist.slice(-10);
                    }
                    currentIndex = 0;

                    navState = {
                        userBans,
                        currentIndex,
                        userAvatarUrl,
                        userId: interaction.user.id
                    };
                    if (interaction.message?.id) {
                        navigationState.set(interaction.message.id, navState);
                    }
                }

                let newIndex = currentIndex;
                if (customId === 'nav_prev') {
                    newIndex = Math.max(0, currentIndex - 1);
                } else if (customId === 'nav_next') {
                    newIndex = Math.min(userBans.length - 1, currentIndex + 1);
                } else if (customId === 'nav_refresh') {
                    const currentData = userBans[currentIndex] || {};
                    const identifiers = currentData.identifiers || {};
                    const blacklist = getBlacklistData();
                    userBans = blacklist.filter(b => {
                        if (!b || !b.identifiers) return false;
                        if (identifiers.license && identifiers.license !== 'Not Provided' && b.identifiers.license === identifiers.license) {
                            return true;
                        }
                        if (identifiers.discord && b.identifiers.discord === identifiers.discord) {
                            return true;
                        }
                        return false;
                    });
                    if (userBans.length === 0) userBans = [currentData];
                    navState.userBans = userBans;
                    newIndex = 0;
                }

                navState.currentIndex = newIndex;
                if (interaction.message?.id) {
                    navigationState.set(interaction.message.id, navState);
                }

                let customEmojis = {};
                try {
                    if (interaction.guild) {
                        customEmojis = await ensureGuildCustomEmojis(interaction.guild);
                    }
                } catch (e) {
                    console.error('[Discord Bot] Emoji resolution error in nav_:', e);
                }

                const newContainer = buildBlacklistContainer(userBans, newIndex, userAvatarUrl, customEmojis);

                const navResponse = {
                    flags: MessageFlags.IsComponentsV2,
                    components: [newContainer]
                };

                await interaction.editReply(navResponse).catch(async (err) => {
                    await interaction.update(navResponse).catch(() => {});
                });
            } catch (err) {
                console.error('[Discord Bot] Error in nav_ button handler:', err);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `❌ Error: ${err.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }
            }
            return true;
        }

        const [action, requestId] = customId.split('_');

        if (action === 'accept' || action === 'reject') {
            const banData = pendingRequests.get(requestId);
            if (!banData) {
                await interaction.reply({ content: '❌ This request has expired or was already processed.', flags: [MessageFlags.Ephemeral] });
                return true;
            }

            if (action === 'reject') {
                pendingRequests.delete(requestId);
                const titleSection = new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# ❌ **Blacklist Request Rejected**'),
                        new TextDisplayBuilder().setContent('```diff\n- The request to add this user to the blacklist has been rejected.\n```')
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }));

                const container = new ContainerBuilder()
                    .setAccentColor(0x393A41)
                    .addSectionComponents(titleSection)
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`<:calendarclock1:1477449996331651153> \`|\` **Time** <t:${Math.floor(Date.now() / 1000)}:R>`)
                    );

                const rejectPayload = {
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                };
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(rejectPayload).catch(() => {});
                } else {
                    await interaction.update(rejectPayload).catch(() => {});
                }
            } else if (action === 'accept') {
                try {
                    let blacklist = getBlacklistData();
                    blacklist.push(banData);
                    saveBlacklistData(blacklist);

                    pendingRequests.delete(requestId);

                    const titleSection = new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('# ✅ **Blacklist Request Accepted**'),
                            new TextDisplayBuilder().setContent('```diff\n+ The request to add this user to the blacklist has been accepted successfully.\n```')
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }));

                    const container = new ContainerBuilder()
                        .setAccentColor(0x393A41)
                        .addSectionComponents(titleSection)
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`<:calendarclock1:1477449996331651153> \`|\` **Time** <t:${Math.floor(Date.now() / 1000)}:R>`)
                        );

                    const acceptPayload = {
                        flags: MessageFlags.IsComponentsV2,
                        components: [container]
                    };
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply(acceptPayload).catch(() => {});
                    } else {
                        await interaction.update(acceptPayload).catch(() => {});
                    }

                    await sendGlobalBlacklistLog(client, banData);
                } catch (e) {
                    console.error('[Discord Bot] Error updating blacklist:', e);
                }
            }
            return true;
        }
    } else if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        if (customId === 'modal_add_cheat_server') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) {
                console.error('[Discord Bot] Error deferring modal_add_cheat_server:', e.message);
                return true;
            }
            if (!interaction.deferred && !interaction.replied) return true;

            const serverId = interaction.fields.getTextInputValue('input_server_id').trim();

            try {
                const res = addCheatServer(serverId, null, `Cheat Server (${serverId})`);

                if (res && res.alreadyExisted) {
                    const warnContainer = new ContainerBuilder()
                        .setAccentColor(0xED4245)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent('# ⚠️ **Server Already Registered!**'),
                                    new TextDisplayBuilder().setContent(`\`\`\`diff\n- Server ID: ${serverId}\n- Status: This server is already in the cheat servers monitoring list.\n\`\`\``)
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                        );

                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [warnContainer]
                    }).catch(() => {});
                    return true;
                }

                const container = new ContainerBuilder()
                    .setAccentColor(0x393A41)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('# ✅ **Cheat Server Added Successfully!**'),
                                new TextDisplayBuilder().setContent(`\`\`\`diff\n+ Server ID: ${serverId}\n+ Live Detection: Active 📡\n\`\`\``)
                            )
                            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                    );

                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                }).catch(() => {});

                setTimeout(async () => {
                    try {
                        const { scrapeGuildBans } = require('./selfbot');
                        await scrapeGuildBans(serverId, 100).catch(() => { });
                    } catch (e) { }
                }, 100);
            } catch (error) {
                console.error('[Discord Bot] Error adding cheat server:', error);
                await interaction.editReply({ content: `❌ Error: ${error.message}` }).catch(() => { });
            }
            return true;
        } else if (customId === 'modal_grant_perm') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) { return true; }
            if (!interaction.deferred && !interaction.replied) return true;

            if (interaction.user.id !== OWNER_ID && !TRUSTED_USERS.includes(interaction.user.id)) {
                await interaction.editReply({ content: '❌ Only Bot Owner can grant permissions.' }).catch(() => {});
                return true;
            }
            const userId = interaction.fields.getTextInputValue('input_user_id').trim();
            const res = grantBlacklistPermission(userId, interaction.user.id);
            if (!res.ok) {
                await interaction.editReply({ content: `⚠️ ${res.error}` }).catch(() => {});
                return true;
            }
            await interaction.editReply({ content: `✅ Granted blacklist add permission to user <@${userId}> (\`${userId}\`).` }).catch(() => {});
            return true;
        } else if (customId === 'modal_revoke_perm') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) { return true; }
            if (!interaction.deferred && !interaction.replied) return true;

            if (interaction.user.id !== OWNER_ID && !TRUSTED_USERS.includes(interaction.user.id)) {
                await interaction.editReply({ content: '❌ Only Bot Owner can revoke permissions.' }).catch(() => {});
                return true;
            }
            const userId = interaction.fields.getTextInputValue('input_user_id').trim();
            const res = revokeBlacklistPermission(userId);
            if (!res.ok) {
                await interaction.editReply({ content: `⚠️ ${res.error}` }).catch(() => {});
                return true;
            }
            await interaction.editReply({ content: `✅ Revoked blacklist add permission from user <@${userId}> (\`${userId}\`).` }).catch(() => {});
            return true;
        } else if (customId === 'modal_add_channel') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) { return true; }
            if (!interaction.deferred && !interaction.replied) return true;

            const channelId = interaction.fields.getTextInputValue('input_channel_id').trim();
            addMonitorChannel(channelId);
            await interaction.editReply({ content: `✅ Added channel \`${channelId}\` to live monitoring and trusted list.` }).catch(() => {});
            return true;
        } else if (customId === 'modal_remove_channel') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) { return true; }
            if (!interaction.deferred && !interaction.replied) return true;

            const channelId = interaction.fields.getTextInputValue('input_channel_id').trim();
            const res = removeMonitorChannel(channelId);
            if (res.removed) {
                await interaction.editReply({ content: `✅ Removed channel \`${channelId}\` from live monitoring.` }).catch(() => {});
            } else {
                await interaction.editReply({ content: `ℹ️ Channel \`${channelId}\` was not in the monitoring list.` }).catch(() => {});
            }
            return true;
        } else if (customId === 'modal_extract_channel_bans') {
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) { return true; }
            if (!interaction.deferred && !interaction.replied) return true;
            const serverId = interaction.fields.getTextInputValue('input_server_id').trim();
            const channelId = interaction.fields.getTextInputValue('input_channel_id').trim();
            const maxMessagesInput = interaction.fields.getTextInputValue('input_max_messages').trim();
            const maxMessages = parseInt(maxMessagesInput) || 200;

            try {
                const { scrapeChannelBans, scrapeGuildBans } = require('./selfbot');
                addCheatServer(serverId, channelId || 'all', `Scraped Server (${serverId})`);

                const onProgress = async ({ fetchedCount, maxMessages, newEntriesCount, channelName }) => {
                    const progressBar = buildProgressBar(fetchedCount, maxMessages);
                    const chInfo = channelName ? ` (Scanning #${channelName})` : '';
                    const progressContainer = new ContainerBuilder()
                        .setAccentColor(0x5865F2)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent('# ⏳ **Extracting Ban Data...**'),
                                    new TextDisplayBuilder().setContent(`📊 **Progress:** ${progressBar}\n📩 **Messages Scraped:** \`${fetchedCount} / ${maxMessages}\`${chInfo}\n👤 **New Cheaters Found:** \`${newEntriesCount}\``)
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                        );

                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [progressContainer]
                    }).catch(() => { });
                };

                let result;
                if (channelId) {
                    result = await scrapeChannelBans(channelId, maxMessages, onProgress);
                } else {
                    result = await scrapeGuildBans(serverId, maxMessages, onProgress);
                }

                const container = new ContainerBuilder()
                    .setAccentColor(0x393A41)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('# ✅ **Ban Data Extraction Complete!**'),
                                new TextDisplayBuilder().setContent(`\`\`\`diff\n+ Server ID: ${serverId}\n+ Channel ID: ${channelId || 'Auto-Scraped All Channels'}\n+ Messages Scraped: ${result.fetchedCount}\n+ New Cheaters Added to Blacklist: ${result.newEntriesCount}\n\`\`\``)
                            )
                            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: DEFAULT_LOGO_URL } }))
                    );

                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                });
            } catch (error) {
                console.error('[Discord Bot] Error during channel ban extraction:', error);
                await interaction.editReply({ content: `❌ **Error extracting bans**: ${error.message}` });
            }
            return true;
        }
    }
    return false;
}

module.exports = {
    buildBlacklistContainer,
    sendGlobalBlacklistLog,
    sendBlacklistApprovalRequest,
    handleBlacklistInteraction,
    preloadBlacklistData,
    getBlacklistData,
    saveBlacklistData,
};
