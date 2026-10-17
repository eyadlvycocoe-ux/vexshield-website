import {
  AlertTriangle,
  Bot,
  Camera,
  CheckCircle2,
  Code,
  Cog,
  FileCheck,
  Fingerprint,
  Globe,
  HelpCircle,
  Key,
  LayoutDashboard,
  ListChecks,
  Lock,
  Radio,
  RefreshCw,
  Rocket,
  ScanLine,
  ScrollText,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import type { DocCategory, DocPage } from "./types";

/* -------------------------------------------------------------------------- */
/*  Category 1: Getting Started                                               */
/* -------------------------------------------------------------------------- */

const introduction: DocPage = {
  id: "introduction",
  title: "Introduction",
  description:
    "Welcome to VexShield — the next-generation autonomous anticheat and live security ecosystem for FiveM.",
  icon: Sparkles,
  lastModified: "2026-10-17",
  badge: "Start Here",
  tags: ["welcome", "overview", "vexshield", "getting started", "anticheat"],
  sections: [
    {
      id: "overview",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "VexShield is an elite FiveM anticheat suite engineered from the ground up for high-performance servers. It features real-time autonomous detection heuristics, server-authoritative state verification, instant Discord webhook logging with in-embed screenshot proof, and a cloud-synced web dashboard.",
        },
        {
          type: "paragraph",
          text: "Unlike outdated anticheats that bog down client tick rates or flood Discord channels with loose image attachments, VexShield executes asynchronous background audits, embeds screenshots directly into the ban embed, and keeps your server immune to Lua executors, server crashers, and trolling menus.",
        },
        {
          type: "callout",
          kind: "tip",
          title: "Quick Navigation",
          body: "New to VexShield? Check [Requirements](/documentation/requirements) and then follow the [Resource Installation](/documentation/installation) steps to get protected in under 3 minutes.",
        },
      ],
    },
    {
      id: "architecture",
      title: "Ecosystem Architecture",
      blocks: [
        {
          type: "list",
          items: [
            "**VexShield FiveM Resource (`VexShield_Resource`):** The core Lua server/client daemon protecting player ped states, weapon integrity, entity spawn bounds, and remote event calls.",
            "**Cloud Security Matrix (`vexshield.site`):** High-speed database syncing ban records, license activations, player snapshots, and hardware telemetry in under 60ms.",
            "**Live Web Dashboard:** Real-time web panel to inspect active bans, view full in-game screenshot captures, review connected players, and unban or configure protections instantly without restarting the FiveM server.",
            "**Clean Discord Webhook Engine:** Rich blue accent embeds with embedded proof clips and auto-purged screenshot attachments so your staff log channels remain pristine.",
          ],
        },
      ],
    },
    {
      id: "conventions",
      title: "Conventions & File Paths",
      blocks: [
        {
          type: "paragraph",
          text: "Throughout this documentation, the resource folder is named `VexShield_Resource`, the main config file is `vex_config.lua`, and license keys use the format `VEXSHIELD-XXXXXX-XXXXXX`.",
        },
        {
          type: "callout",
          kind: "note",
          body: "All code snippets provide an instant copy button. Hover over any block to copy commands, configs, or ACE permissions directly to your clipboard.",
        },
      ],
    },
  ],
};

const requirements: DocPage = {
  id: "requirements",
  title: "Requirements",
  description: "Server artifacts, dependencies, and network requirements before installing VexShield.",
  icon: ListChecks,
  lastModified: "2026-10-17",
  badge: "Prerequisites",
  tags: ["requirements", "prerequisites", "fivem", "onesync", "artifacts", "txadmin"],
  sections: [
    {
      id: "server-requirements",
      title: "Server & Environment",
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "Ensure your FiveM server environment satisfies these prerequisites to ensure optimal detection speed and zero false positives.",
        },
        {
          type: "table",
          columns: ["Requirement", "Recommended", "Purpose"],
          rows: [
            ["FiveM Server Build", "Recommended Artifact (Latest)", "Ensures availability of the newest native security events & entity routing."],
            ["OneSync", "OneSync Infinity or Enabled", "Required for server-authoritative player tracking, entity ownership, and network culling."],
            ["Screenshot Dependency", "screenshot-basic", "Required for VexShield's automated in-embed player screenshot capture upon ban."],
            ["Outbound HTTPS", "Port 443 Open to vexshield.site", "Allows the game server to communicate with the license verification API and live ban dashboard."],
            ["txAdmin or Console", "txAdmin / VPS Terminal", "Used to view real-time VexShield console logs and trigger admin commands."],
          ],
        },
      ],
    },
    {
      id: "license-account",
      title: "Account & License Binding",
      blocks: [
        {
          type: "list",
          items: [
            "A registered account on **https://vexshield.site** logged in via Discord.",
            "An activated license key (`VEXSHIELD-XXXXXX-XXXXXX`) redeemed in **My Servers** bound to your server IP.",
            "Your Discord Webhook URLs ready for Ban announcements and Connection logs.",
          ],
        },
        {
          type: "callout",
          kind: "warning",
          title: "Single Server License Policy",
          body: "Each VexShield license key is securely bound to your registered server IP. If you migrate VPS providers, re-bind your IP in the dashboard under My Servers before starting the server.",
        },
      ],
    },
  ],
};

const installation: DocPage = {
  id: "installation",
  title: "Installation Guide",
  description: "Step-by-step walkthrough to install VexShield_Resource and activate autonomous protection.",
  icon: Rocket,
  lastModified: "2026-10-17",
  badge: "Installation",
  tags: ["installation", "setup", "vexshield_resource", "server.cfg", "vex_config.lua"],
  sections: [
    {
      id: "overview",
      title: "Quick Start Workflow",
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "Installing VexShield takes less than 3 minutes. Follow the numbered steps below to extract the resource, configure your license, and start the anticheat.",
        },
      ],
    },
    {
      id: "steps",
      title: "Step-by-step Setup",
      blocks: [
        {
          type: "steps",
          steps: [
            {
              title: "Redeem License in Dashboard",
              description:
                "Navigate to [My Servers](https://vexshield.site/my-servers). Click **Redeem License Key**, enter your license key (e.g. `VEXSHIELD-PXWOUH-GAMGXA`) and your server host/IP (e.g. `172.96.140.62`), then click **Activate Server Protection**.",
            },
            {
              title: "Download VexShield Resource",
              description:
                "Download the latest production release package `VexShield_Resource.zip` from your customer dashboard or the Download page.",
            },
            {
              title: "Extract to Resources Folder",
              description:
                "Unpack the ZIP file into your server's resources directory. The folder MUST be named `VexShield_Resource`.",
              code: {
                language: "text",
                content: "resources/[anticheat]/VexShield_Resource",
              },
            },
            {
              title: "Configure vex_config.lua",
              description:
                "Open `VexShield_Resource/vex_config.lua` in your editor. Insert your License Key, Server IP, and Discord Webhooks.",
              code: {
                language: "lua",
                filename: "vex_config.lua",
                content: `-- VexShield Master Configuration
Config = {}

Config.LicenseKey = "VEXSHIELD-XXXXXX-XXXXXX" -- Your license key
Config.ServerIP = "172.96.140.62"             -- Your server node IP

-- Discord Webhook Integrations
Config.DiscordBanWebhook = "https://discord.com/api/webhooks/YOUR_BAN_WEBHOOK"
Config.DiscordConnectionWebhook = "https://discord.com/api/webhooks/YOUR_CONN_WEBHOOK"

-- ScreenShot Verification
Config.ScreenShot = true                      -- Captures player screen on ban

-- Ban Settings
Config.BanMessage = "VexShield Autonomous Defense: Cheating Activity Detected."`,
              },
            },
            {
              title: "Add to server.cfg & Start",
              description:
                "Add `ensure screenshot-basic` and `ensure VexShield_Resource` at the top of your `server.cfg` right before your gameplay resources, then restart your server.",
              code: {
                language: "cfg",
                filename: "server.cfg",
                content: `# Ensure dependencies
ensure screenshot-basic

# Start VexShield Anticheat
ensure VexShield_Resource`,
              },
            },
          ],
        },
        {
          type: "callout",
          kind: "tip",
          title: "Startup Verification",
          body: "Upon server boot, check your console for the green VexShield ASCII banner and the message: `[VexShield] Autonomous matrix connected. License verified for server [ONLINE]`. Your server is now fully protected.",
        },
      ],
    },
  ],
};

const welcomeFaq: DocPage = {
  id: "faq",
  title: "Frequently Asked Questions",
  description: "Answers to common questions regarding bans, false positives, performance, and updates.",
  icon: HelpCircle,
  lastModified: "2026-10-17",
  badge: "FAQ",
  tags: ["faq", "help", "questions", "unban", "false positives", "support"],
  sections: [
    {
      id: "general-faq",
      title: "General & Licensing",
      blocks: [
        { type: "heading", level: 3, text: "How does the ban sync between the game and the dashboard work?" },
        {
          type: "paragraph",
          text: "When a player is banned in-game by VexShield, the ban record and player identifiers are instantly transmitted over HTTPS to our database and appear on your live dashboard at `https://vexshield.site/:serverId/bans` in under 1 second.",
        },
        { type: "heading", level: 3, text: "How do I unban a player?" },
        {
          type: "paragraph",
          text: "You can unban players in two ways: (1) Open your web dashboard at `https://vexshield.site/:serverId/bans`, find the banned player, and click the **Unban Player** button. (2) From the server console or in-game admin menu (`/vex`), revoke the ban by Ban ID or License.",
        },
        { type: "heading", level: 3, text: "Does VexShield affect server performance or client FPS?" },
        {
          type: "paragraph",
          text: "No. VexShield is written in optimized Lua with non-blocking event loops, batched network snapshots, zero O(n²) iterations, and native OneSync thread listeners. Client-side overhead is less than 0.02ms tick time.",
        },
        { type: "heading", level: 3, text: "What happens if a legitimate script triggers a detection?" },
        {
          type: "paragraph",
          text: "Never disable an entire protection module for a single resource. Simply add the script's name or event trigger to `Config.WhitelistedEvents` or `Config.WhitelistedResources` in `vex_config.lua`, or configure exemptions directly on your web dashboard Settings page.",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Category 2: VexShield Anticheat                                           */
/* -------------------------------------------------------------------------- */

const vexshieldDetections: DocPage = {
  id: "vexshield-detections",
  title: "Protections & Detections",
  description: "Comprehensive breakdown of cheat vectors, exploits, and attacks neutralized by VexShield.",
  icon: ShieldAlert,
  lastModified: "2026-10-17",
  badge: "Detections",
  tags: ["detections", "godmode", "noclip", "aimbot", "freecam", "blacklist", "crash"],
  sections: [
    {
      id: "player-integrity",
      title: "Player Integrity & Movement",
      icon: Shield,
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "VexShield continuously audits player ped coordinates, health buffers, collision boxes, and velocity vectors to prevent movement and physical exploits.",
        },
        {
          type: "table",
          columns: ["Protection", "Detection Mechanism", "Default Action"],
          rows: [
            ["Godmode / Health Spoof", "Server-authoritative health checks; detects infinite health, invincible peds, and health freeze.", "Ban"],
            ["Semi-Godmode", "Monitors damage intake deltas; catches subtle damage reduction cheats.", "Ban"],
            ["Invisible / Ghost", "Verifies alpha channels, entity visibility flags, and network synchronization states.", "Ban"],
            ["Noclip / Teleportation", "Calculates maximum allowable travel speed per tick factoring current vehicle/aircraft physics.", "Ban"],
            ["Freecam / No-Clip Camera", "Detects detached camera positioning through walls, floors, and collision geometry.", "Ban"],
            ["Super Jump & Speedhack", "Verifies physical jump impulse and player on-foot velocity against physics limits.", "Ban"],
            ["Infinite Stamina / Swim", "Monitors stamina depletion counters during sprints, swimming, and heavy actions.", "Kick"],
          ],
        },
      ],
    },
    {
      id: "weapons-combat",
      title: "Weapons & Combat Protections",
      icon: Zap,
      blocks: [
        {
          type: "paragraph",
          text: "Combat cheats are stopped in their tracks before they can disrupt roleplay or PvP combat on your server.",
        },
        {
          type: "table",
          columns: ["Protection", "Detection Mechanism", "Default Action"],
          rows: [
            ["Blacklisted Weapons", "Audits ped weapon inventory against server-allowed firearms; catches spawned RPGs, Miniguns, and railguns.", "Ban"],
            ["Explosive / Flaming Ammo", "Detects client modifier flags adding unauthorized explosive or incendiary impact effects.", "Ban"],
            ["Thermal & Night Vision", "Blocks unauthorized screen filters typically used to spot players through buildings.", "Ban"],
            ["Rapid Fire / No Reload", "Measures bullet intervals per weapon type to catch fire-rate multipliers and instant reload hacks.", "Ban"],
            ["Damage Multipliers", "Server-authoritative damage verification preventing one-shot pistol or melee kills.", "Ban"],
          ],
        },
      ],
    },
    {
      id: "vehicle-entity",
      title: "Vehicle & Entity Protections",
      icon: Radio,
      blocks: [
        {
          type: "paragraph",
          text: "Neutralizes troll menus spawning massive props, planes, or modifying vehicle physics.",
        },
        {
          type: "table",
          columns: ["Protection", "Detection Mechanism", "Default Action"],
          rows: [
            ["Vehicle GodMode", "Verifies vehicle deformation, engine health, and body integrity.", "Ban"],
            ["Fly Car / Torque Hack", "Monitors vehicle altitude and airborne acceleration against normal driving physics.", "Ban"],
            ["Blacklisted Vehicle Spawner", "Instantly deletes spawned blacklisted military vehicles, tanks, and blimps.", "Ban"],
            ["Speed Boost / Handling Hack", "Detects client-side handling modifications and artificial nitro boosters.", "Ban"],
          ],
        },
      ],
    },
    {
      id: "injection-crash",
      title: "Lua Injection & Server Crash Defense",
      icon: Terminal,
      blocks: [
        {
          type: "paragraph",
          text: "Protects your server from executor menus trying to crash the server or steal economy data via remote events.",
        },
        {
          type: "table",
          columns: ["Protection", "Detection Mechanism", "Default Action"],
          rows: [
            ["Mass Entity Spawner", "Entity rate-limiter catching attempts to spawn hundreds of peds, objects, or vehicles in one frame.", "Ban"],
            ["Particle Spam / Crashers", "Filters looped PTFX particle calls used by malicious menus to lag or crash client games.", "Ban"],
            ["Remote Event Spoofing", "Server-side event payload validation protecting framework money, item, and admin triggers.", "Ban"],
            ["Mass Explosion Trolling", "Detects unauthorized explosion creation events originating from non-admin clients.", "Ban"],
            ["Malformed Packet Floods", "Drops illegal network buffers that exploit FiveM server vulnerabilities.", "Drop & Ban"],
          ],
        },
      ],
    },
  ],
};

const vexshieldConfig: DocPage = {
  id: "vexshield-config",
  title: "Configuration (vex_config.lua)",
  description: "Detailed reference for every option and security toggle inside vex_config.lua.",
  icon: Cog,
  lastModified: "2026-10-17",
  badge: "Configuration",
  tags: ["vex_config.lua", "config", "settings", "options", "webhooks", "exempt"],
  sections: [
    {
      id: "core-settings",
      title: "Core Credentials & Network",
      icon: Lock,
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "The primary configuration for VexShield is located in `VexShield_Resource/vex_config.lua`. Below are the critical settings required for authentication and reporting.",
        },
        {
          type: "code",
          language: "lua",
          filename: "vex_config.lua",
          code: `-- VexShield License & Binding
Config.LicenseKey = "VEXSHIELD-PXWOUH-GAMGXA" -- Found in your customer dashboard
Config.ServerIP = "172.96.140.62"             -- Your server's public IP address

-- Screenshot Verification
Config.ScreenShot = true                      -- Takes player screenshot upon ban (requires screenshot-basic)

-- Discord Webhooks
Config.DiscordBanWebhook = "https://discord.com/api/webhooks/..."        -- Player Banned logs
Config.DiscordConnectionWebhook = "https://discord.com/api/webhooks/..." -- Connect/Disconnect logs

-- Ban Enforcement Message
Config.BanMessage = "VexShield Security: You have been permanently banned for cheating."`,
        },
      ],
    },
    {
      id: "exempt-groups",
      title: "Exempt Groups & Roles",
      icon: Users,
      blocks: [
        {
          type: "paragraph",
          text: "Under `Config.ExemptGroups`, define framework permission groups (ESX, QBCore, or custom) that should be exempted from certain client detections (such as godmode or teleport during staff duties):",
        },
        {
          type: "code",
          language: "lua",
          filename: "vex_config.lua",
          code: `Config.ExemptGroups = {
    "superadmin",
    "admin",
    "moderator"
}`,
        },
        {
          type: "callout",
          kind: "note",
          title: "Staff Whitelisting",
          body: "Exempt groups only skip non-destructive checks (like staff teleporting to players). Hard-block crash protections and executor blocks remain active for total server safety.",
        },
      ],
    },
    {
      id: "event-whitelisting",
      title: "Event & Resource Whitelisting",
      icon: FileCheck,
      blocks: [
        {
          type: "paragraph",
          text: "If a legitimate community script fires events frequently or spawns custom items that trip security checks, whitelist the event name in `Config.WhitelistedEvents` rather than disabling the anticheat:",
        },
        {
          type: "code",
          language: "lua",
          filename: "vex_config.lua",
          code: `Config.WhitelistedEvents = {
    "esx_billing:sendBill",
    "qb-inventory:server:SaveStashItems",
    "custom_mechanic:giveRepairKit"
}`,
        },
      ],
    },
  ],
};

const vexshieldDashboard: DocPage = {
  id: "vexshield-dashboard",
  title: "Web Dashboard & Live Sync",
  description: "Live server management, ban revocation, screenshot gallery, and instant configuration sync.",
  icon: LayoutDashboard,
  lastModified: "2026-10-17",
  badge: "Web Panel",
  tags: ["dashboard", "web panel", "bans", "unban", "live sync", "vexshield.site"],
  sections: [
    {
      id: "live-bans",
      title: "Live Ban Management",
      icon: ScrollText,
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "Access your server dashboard anytime at `https://vexshield.site/:serverId/bans`. The dashboard connects directly to the high-performance database cluster for instant updates.",
        },
        {
          type: "list",
          items: [
            "**Instant Ban Inspection:** View player names, ban IDs, hardware licenses (Steam, Discord tag, License, Xbox, Live), IP, and detection reason.",
            "**Embedded Screenshot Proof:** Every ban record includes the exact in-game screenshot taken at the moment of the violation.",
            "**One-Click Unban:** Click the **Unban Player** button on any active ban row. The revocation is pushed instantly to the game server.",
            "**Search & Filter:** Search bans by player name, steam identifier, Discord snowflake, or specific ban ID (e.g. `VEX-0001`).",
          ],
        },
      ],
    },
    {
      id: "live-settings",
      title: "Zero-Downtime Settings Sync",
      icon: RefreshCw,
      blocks: [
        {
          type: "paragraph",
          text: "When you toggle a protection module or adjust action levels (Ban vs Kick vs Warn) in your dashboard under **Settings**, VexShield transmits a real-time event to the FiveM resource. Your server updates its detection engine on the fly without restarting or kicking players.",
        },
      ],
    },
    {
      id: "player-snapshots",
      title: "Live Player Snapshots & Auditing",
      icon: Users,
      blocks: [
        {
          type: "paragraph",
          text: "The **Players** page (`https://vexshield.site/:serverId/players`) provides a live roster of connected users, their ping, server session identifiers, and status, updated every few seconds.",
        },
      ],
    },
  ],
};

const vexshieldCommands: DocPage = {
  id: "vexshield-commands",
  title: "Commands & Permissions",
  description: "In-game admin panel, console utilities, and ACE permission structure.",
  icon: Terminal,
  lastModified: "2026-10-17",
  badge: "Commands",
  tags: ["commands", "/vex", "admin menu", "permissions", "ace", "console"],
  sections: [
    {
      id: "commands",
      title: "In-Game & Console Commands",
      icon: Terminal,
      blocks: [
        {
          type: "table",
          variant: "commands",
          columns: ["Command", "Scope", "Description"],
          rows: [
            ["/vex", "In-Game Chat", "Opens the VexShield in-game administrative menu."],
            ["/vexshield", "In-Game Chat", "Alias to launch the VexShield in-game security panel."],
            ["vex_status", "Server Console", "Prints active license status, connection latency, and loaded modules."],
            ["vex_reload", "Server Console", "Reloads `vex_config.lua` and refreshes event whitelists."],
            ["vex_sync", "Server Console", "Forces an immediate bi-directional ban sync with the cloud database."],
          ],
        },
      ],
    },
    {
      id: "ace-permissions",
      title: "ACE Permissions Configuration",
      icon: Fingerprint,
      blocks: [
        {
          type: "paragraph",
          text: "VexShield integrates directly into FiveM's native ACE permission system. Add these lines to your `server.cfg` to grant your staff access to the in-game menu:",
        },
        {
          type: "table",
          variant: "permissions",
          columns: ["Permission", "Description"],
          rows: [
            ["vex.admin", "Allows opening the `/vex` in-game menu and reviewing active alerts."],
            ["vex.whitelist", "Exempts the target player or group from standard movement detections."],
            ["vex.unban", "Permits revoking bans directly from in-game commands."],
          ],
        },
        {
          type: "code",
          language: "cfg",
          filename: "server.cfg",
          code: `# VexShield ACE Permissions
add_ace group.admin vex.admin allow
add_ace group.admin vex.whitelist allow
add_ace group.admin vex.unban allow

# Bind your Discord or Steam identifier to the admin group
add_principal identifier.discord:1134674389254803456 group.admin`,
        },
      ],
    },
  ],
};

const vexshieldDiscordWebhooks: DocPage = {
  id: "vexshield-discord-webhooks",
  title: "Discord Webhooks & Proof",
  description: "Format, fields, and clean channel engine for VexShield Discord webhook embeds.",
  icon: Webhook,
  lastModified: "2026-10-17",
  badge: "Discord",
  tags: ["discord", "webhooks", "screenshot", "proof", "clean channel", "embed"],
  sections: [
    {
      id: "ban-embed-format",
      title: "Player Banned Webhook Format",
      icon: Webhook,
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "When a player is banned, VexShield compiles a signature Discord embed designed to give staff actionable, tamper-proof evidence in one place.",
        },
        {
          type: "list",
          items: [
            "**VexShield Header & Blue Accent:** Styled with `#3498DB` accent color, official author banner, and thumbnail.",
            "**Clean Field Layout:** Plain readable fields showing `Name`, `Ban Id`, `discord` (mention/tag), `license`, `steam`, `xBox`, `Live`, `Ip`, `City`, `Google Map`, `Reason`, `Type` (`L1`), `Category` (`Detection`), `Details`, and `Proof` (`[own clip](...)`).",
            "**In-Embed Screenshot:** The screenshot captured via `screenshot-basic` is embedded directly into the embed card (`image: { url = screenshotUrl }`).",
            "**Clean Channel Guarantee:** Loose screenshot attachments are automatically wiped from the channel via Discord API message deletion, leaving only the beautiful embed.",
          ],
        },
        {
          type: "callout",
          kind: "tip",
          title: "Proof Clip Links",
          body: "Staff can view the screenshot full-screen inside Discord, or click the [own clip] link to inspect the cloud-hosted capture anytime.",
        },
      ],
    },
    {
      id: "connection-logs",
      title: "Player Connected & Disconnected",
      icon: Users,
      blocks: [
        {
          type: "paragraph",
          text: "Player connection and disconnection events are logged to `Config.DiscordConnectionWebhook`. The logs detail player join time, IP, city geolocation, ping, identifiers, and reason for leaving.",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Doc Categories Structure                                                  */
/* -------------------------------------------------------------------------- */

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    emoji: "🚀",
    icon: Rocket,
    pages: [introduction, requirements, installation, welcomeFaq],
  },
  {
    id: "vexshield",
    label: "VexShield Anticheat",
    emoji: "🛡️",
    icon: Shield,
    pages: [
      vexshieldDetections,
      vexshieldConfig,
      vexshieldDashboard,
      vexshieldCommands,
      vexshieldDiscordWebhooks,
    ],
  },
];