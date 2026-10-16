const {
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    SectionBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} = require('discord.js');
const path = require('path');

const LOGO_PATH = path.join(__dirname, 'logo.png');

function getLogoAttachment() {
    return new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
}

/** Embed Theme Colors */
const COLORS = {
    PRIMARY: 0x5865F2,   // VexShield Blurple / Cyan
    SUCCESS: 0x10B981,   // Emerald Green
    WARNING: 0xF59E0B,   // Amber Yellow
    ERROR: 0xEF4444,     // Red
    CYAN: 0x00F0FF,      // Neon Cyan
};

/** Build /connect success embed */
function buildConnectSuccessEmbed(server) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('🛡️ VexShield Network — Server Connected Successfully!')
        .setDescription(`Your Discord server has been successfully connected to **VexShield Anticheat**.`)
        .setThumbnail('attachment://logo.png')
        .addFields(
            { name: '🏷️ Server Name', value: `\`${server.display_name || 'VexShield Server'}\``, inline: true },
            { name: '🌐 Server IP', value: `\`${server.server_ip}\``, inline: true },
            { name: '⚡ Status', value: '`Active 🟢`', inline: true },
            { name: '🔑 License Key', value: `\`${server.license_key}\``, inline: false },
            {
                name: '🚀 Next Step',
                value: 'Run **`/create`** to generate the Category, Channels, Webhooks, and automatically sync your website settings! ⚡'
            }
        )
        .setFooter({ text: 'VexShield Network Security • Verified & Connected', iconURL: 'attachment://logo.png' })
        .setTimestamp();

    return { embeds: [embed], files: [getLogoAttachment()] };
}

/** Build /create success embed ("last embed" design) */
function buildCreateSuccessEmbed(server, categoryName, channels, luaConfig) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.CYAN)
        .setTitle('⚡ VexShield Anticheat — Channels & Webhooks Created!')
        .setDescription(
            `Successfully created category **\`${categoryName}\`**, generated webhooks, and setup logging channels for **VexShield Anticheat**.\n\n` +
            `✅ **Webhook URLs have been automatically saved & synced to your Website Dashboard & Database!**`
        )
        .setThumbnail('attachment://logo.png')
        .addFields(
            { name: '📁 Category', value: `\`${categoryName}\``, inline: true },
            { name: '🖥️ Connected Server', value: `\`${server.display_name || 'VexShield'}\` (\`${server.server_ip}\`)`, inline: true },
            { name: '🔄 Website Sync', value: '`Synced with Website DB 🟢`', inline: true },
            {
                name: '📌 Channels & Webhooks Created',
                value:
                    `🌐 **logs**: <#${channels.logs.id}>\n` +
                    `🚪 **logsLeave**: <#${channels.logsLeave.id}>\n` +
                    `🔌 **logsConnection**: <#${channels.logsConnection.id}>\n` +
                    `🔨 **logsBans**: <#${channels.logsBans.id}>\n` +
                    `💀 **punishments**: <#${channels.punishments ? channels.punishments.id : channels.logsBans.id}>`
            },
            {
                name: '📝 FiveM Config Snippet (`config.lua`)',
                value: `\`\`\`lua\n${luaConfig}\n\`\`\``
            }
        )
        .setFooter({ text: 'VexShield Network • Automated Config & Webhook Sync', iconURL: 'attachment://logo.png' })
        .setTimestamp();

    return { embeds: [embed], files: [getLogoAttachment()] };
}

/** Build /status embed */
function buildStatusEmbed(connection, webhooks) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('📊 VexShield Network — Server Connection Status')
        .setThumbnail('attachment://logo.png')
        .addFields(
            { name: '🛡️ Connected Server', value: `\`${connection.display_name || 'VexShield Server'}\``, inline: true },
            { name: '🌐 Server IP', value: `\`${connection.server_ip}\``, inline: true },
            { name: '🔑 License Key', value: `\`${connection.license_key}\``, inline: false },
            { name: '📅 Connected Date', value: `<t:${Math.floor(new Date(connection.connected_at).getTime() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'VexShield Network Security', iconURL: 'attachment://logo.png' })
        .setTimestamp();

    if (webhooks && Object.keys(webhooks).length > 0) {
        const luaSnippet =
            `Config.logsBans = "${webhooks.logsBans || ''}"
Config.logsConnection = "${webhooks.logsConnection || ''}"
Config.logsLeave = "${webhooks.logsLeave || ''}"
Config.logsWebhook = "${webhooks.logsWebhook || ''}"`;

        embed.addFields({
            name: '📝 Registered Webhooks in Website Database',
            value: `\`\`\`lua\n${luaSnippet}\n\`\`\``
        });
    }

    return { embeds: [embed], files: [getLogoAttachment()] };
}

/** Build Error Embed */
function buildErrorEmbed(title, description) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setThumbnail('attachment://logo.png')
        .setFooter({ text: 'VexShield Network System Error', iconURL: 'attachment://logo.png' })
        .setTimestamp();

    return { embeds: [embed], files: [getLogoAttachment()] };
}

/** Build Help Embed */
function buildHelpEmbed() {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('📖 VexShield Network Bot — Command Manual')
        .setDescription('Welcome to the official **VexShield Anticheat Bot**! Use the commands below to configure your server:')
        .setThumbnail('attachment://logo.png')
        .addFields(
            {
                name: '🔗 `/connect [license] [ip]`',
                value: 'Binds this Discord server to your VexShield License Key and updates your server IP address on the website.'
            },
            {
                name: '🏗️ `/create`',
                value: 'Creates the `VexShield anticheat` category, channels (logs, logsLeave, logsConnection, logsBans), generates webhooks, and auto-syncs them to your website database.'
            },
            {
                name: '📊 `/status`',
                value: 'Displays connection details and registered webhooks in the system.'
            },
            {
                name: '🔌 `/disconnect`',
                value: 'Unbinds the Discord server from your License Key.'
            }
        )
        .setFooter({ text: 'VexShield Network Security • Documentation', iconURL: 'attachment://logo.png' })
        .setTimestamp();

    return { embeds: [embed], files: [getLogoAttachment()] };
}

/** Build Jail Ban Embed / Container V2 with imoji folder emojis */
function buildJailBanEmbed(banData) {
    const {
        playerName,
        discordId,
        reason,
        duration,
        clipUrl,
        punishmentId,
        avatarUrl,
        identifiers,
        serverName,
        customEmojis
    } = banData;

    const em = customEmojis || {};
    const eTitle = em.title ? `${em.title} ` : '♻️ ';
    const eUser = em.user ? `${em.user} ` : '📌 ';
    const eUsername = em.username ? `${em.username} ` : '👤 ';
    const eReason = em.reason ? `${em.reason} ` : '⚙️ ';
    const eLicense = em.license ? `${em.license} ` : '🔑 ';
    const eServer = em.server ? `${em.server} ` : '🌐 ';
    const eTime = em.time ? `${em.time} ` : '⏰ ';

    const cleanDiscordId = String(discordId || '').replace(/^discord:/i, '').trim();
    const userDisplayName = playerName && playerName !== 'Unknown' && playerName !== 'Unknown Player'
        ? playerName
        : (cleanDiscordId || 'Unknown');

    const userAvatarUrl = (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('http') && !avatarUrl.includes('attachments/1478757351237488711'))
        ? avatarUrl
        : (cleanDiscordId
            ? `https://unavatar.io/discord/${cleanDiscordId}`
            : 'https://cdn.discordapp.com/embed/avatars/0.png');

    const licenseStr = (identifiers && (identifiers.license || identifiers.license2))
        ? (identifiers.license || identifiers.license2)
        : 'Unknown';

    const serverDisplay = serverName || (identifiers && identifiers.server) || 'VexShield Server';
    const finalReason = `${reason || 'No reason provided'} (Time: ${duration || 'Permanent'})`;
    const nowTimestamp = Math.floor(Date.now() / 1000);

    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${eTitle}**VexShield Ban User**`),
            new TextDisplayBuilder().setContent('```diff\n- A cheater has been detected and permanently banned by VexShield Anticheat.\n```'),
            new TextDisplayBuilder().setContent('```diff\n- If you believe this ban was issued in error, please open a support ticket to appeal.\n```')
        )
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatarUrl } }));

    const userInfo1 = new TextDisplayBuilder().setContent(`${eUser}\`|\` **User ID** ${cleanDiscordId ? `<@${cleanDiscordId}>` : '`no linked`'}`);
    const userInfo2 = new TextDisplayBuilder().setContent(`${eUsername}\`|\` **Username** \`${userDisplayName}\``);
    const userInfo3 = new TextDisplayBuilder().setContent(`${eReason}\`|\` **Reason** \`${finalReason}\``);
    const userInfo4 = new TextDisplayBuilder().setContent(`${eLicense}\`|\` **License** \`${licenseStr}\``);
    const userInfo5 = new TextDisplayBuilder().setContent(`${eServer}\`|\` **Server** \`${serverDisplay}\``);

    let mediaGallery = null;
    let clipTextDisplay = null;

    if (clipUrl && typeof clipUrl === 'string' && clipUrl.startsWith('http') && clipUrl !== 'no-video' && clipUrl !== 'no-image') {
        const isDirectImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(clipUrl);
        if (isDirectImage) {
            mediaGallery = new MediaGalleryBuilder();
            mediaGallery.addItems(new MediaGalleryItemBuilder().setURL(clipUrl));
        } else {
            clipTextDisplay = new TextDisplayBuilder().setContent(`🎬 \`|\` **Ban Clip** [**Click Here to Watch Video**](${clipUrl})`);
        }
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x393A41)
        .addSectionComponents(titleSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(userInfo1, userInfo2, userInfo3, userInfo4, userInfo5);

    if (clipTextDisplay) {
        container.addTextDisplayComponents(clipTextDisplay);
    }

    if (mediaGallery) {
        container.addMediaGalleryComponents(mediaGallery);
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${eTime}\`|\` **Time** <t:${nowTimestamp}:R>`),
            new TextDisplayBuilder().setContent('||@everyone||')
        );

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files: [getLogoAttachment()]
    };
}

module.exports = {
    buildConnectSuccessEmbed,
    buildCreateSuccessEmbed,
    buildStatusEmbed,
    buildErrorEmbed,
    buildHelpEmbed,
    buildJailBanEmbed,
    COLORS,
};
