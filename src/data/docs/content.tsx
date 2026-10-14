import { Bot,
  Cog,
  FileCheck,
  Fingerprint,
  HelpCircle,
  Key,
  LayoutDashboard,
  ListChecks,
  Lock,
  RefreshCw,
  Rocket,
  ScanLine,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
 } from "lucide-react";
import type { DocCategory, DocPage } from "./types";

/* -------------------------------------------------------------------------- */
/*  Welcome                                                                   */
/* -------------------------------------------------------------------------- */

const introduction: DocPage = {
  id: "introduction",
  title: "Introduction",
  description:
    "Welcome to the VexShield documentation. Learn how the anticheat ecosystem fits together.",
  icon: Sparkles,
  lastModified: "2026-06-20",
  badge: "Start here",
  tags: ["welcome", "overview", "airshield", "getting started"],
  sections: [
    {
      id: "overview",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "VexShield is a premier FiveM anticheat and protection suite. This documentation covers installation steps, commands, permissions, configuration, and examples.",
        },
        {
          type: "paragraph",
          text: "Use the sidebar to browse categories, the search bar (or `Ctrl` `K`) to find commands and permissions, and the table of contents on the right to navigate within a page.",
        },
      ],
    },
    {
      id: "products",
      title: "Product",
      blocks: [
        {
          type: "list",
          items: [
            "**VexShield:** the core FiveM anticheat: detections, bans, whitelist, and an in-game admin menu.",
          ],
        },
        {
          type: "callout",
          kind: "tip",
          title: "New here?",
          body: "Read [Requirements](/documentation/requirements) and [Installation](/documentation/installation) first, then open the page for the product you purchased.",
        },
      ],
    },
    {
      id: "conventions",
      title: "Conventions",
      blocks: [
        {
          type: "paragraph",
          text: "Throughout the docs, console commands look like `airupdate`, file paths look like `resources/[local]/airshield`, and placeholders such as `AIRSHIELD-XXXXXX-XXXXXX` should be replaced with your real values.",
        },
        {
          type: "callout",
          kind: "note",
          body: "Code blocks include a copy button. Hover a block and click the copy icon, or use the global search to find a specific command.",
        },
      ],
    },
  ],
};

const installation: DocPage = {
  id: "installation",
  title: "Installation",
  description: "General getting-started flow for connecting a server and installing VexShield products.",
  icon: Rocket,
  lastModified: "2026-06-21",
  tags: ["installation", "setup", "getting started", "server.cfg"],
  sections: [
    {
      id: "overview",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "Installation always follows the same shape: connect your server in the dashboard, download the product, drop it into your resources, and authenticate it with your license key.",
        },
        {
          type: "video",
          src: "/doc.mp4",
          title: "VexShield installation walkthrough",
        },
        {
          type: "callout",
          kind: "info",
          title: "VexShield installation video",
          body: "Watch the video above for the full VexShield installation flow, then follow the written steps below to copy the exact `server.cfg` values.",
        },
      ],
    },
    {
      id: "steps",
      title: "Step-by-step",
      blocks: [
        {
          type: "steps",
          steps: [
            {
              title: "Connect your server",
              description:
                "Open **My Servers** in the dashboard and connect (or add) the server you want to protect. Each product is enabled per server license.",
            },
            {
              title: "Download the product",
              description:
                "Open the **Download** page for the connected server and download the package you need (VexShield).",
            },
            {
              title: "Upload to resources",
              description: "Extract the folder into your server's resources directory.",
              code: { language: "text", content: "resources/[local]/airshield" },
            },
            {
              title: "Add credentials to server.cfg",
              description: "Add your server IP and license key so the resource can authenticate with the panel.",
              code: {
                language: "cfg",
                content:
                  'set airshield_server_ip "your_host/vps_ip"\nset airshield_license_key "AIRSHIELD-XXXXXX-XXXXXX"',
              },
            },
            {
              title: "Start the resource",
              description: "Add an `ensure` line and restart the server.",
              code: { language: "cfg", content: "ensure airshield" },
            },
          ],
        },
        {
          type: "callout",
          kind: "warning",
          title: "Keep your key private",
          body: "Never share your license key publicly or commit it to a repository. Keys are tied to your account and can be suspended if leaked.",
        },
      ],
    },
  ],
};

const requirements: DocPage = {
  id: "requirements",
  title: "Requirements",
  description: "Server, software, and account requirements before installing VexShield products.",
  icon: ListChecks,
  lastModified: "2026-06-18",
  tags: ["requirements", "prerequisites", "fivem", "txadmin"],
  sections: [
    {
      id: "overview",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "Make sure your environment meets these requirements to avoid the most common installation problems.",
        },
      ],
    },
    {
      id: "server",
      title: "Server",
      blocks: [
        {
          type: "table",
          columns: ["Requirement", "Minimum", "Notes"],
          rows: [
            ["FiveM artifacts", "Recent recommended build", "Older artifacts may miss APIs used by detections."],
            ["OneSync", "Enabled", "Required for accurate player and entity tracking."],
            ["Outbound HTTPS", "Allowed", "The resource must reach `https://aircore.xyz`."],
            ["Console access", "txAdmin or RCON", "Needed to run console-only commands such as `airupdate`."],
          ],
        },
      ],
    },
    {
      id: "account",
      title: "Account & licensing",
      blocks: [
        {
          type: "list",
          items: [
            "An VexShield account with at least one connected server.",
            "An active license/entitlement for each product you intend to use.",
            "Your `server_ip` and `license_key` available for `server.cfg`.",
          ],
        },
        {
          type: "callout",
          kind: "info",
          body: "Entitlements are per server. For example, AirEye needs `ent_aireye` enabled on that server's license.",
        },
      ],
    },
  ],
};

const welcomeFaq: DocPage = {
  id: "faq",
  title: "FAQ",
  description: "Answers to the most common questions about accounts, licensing, and support.",
  icon: HelpCircle,
  lastModified: "2026-06-15",
  tags: ["faq", "help", "questions", "support"],
  sections: [
    {
      id: "general",
      title: "General",
      blocks: [
        { type: "heading", level: 3, text: "Where do I download the scripts?" },
        {
          type: "paragraph",
          text: "From the **Download** page of a connected server in the dashboard. Do not use unofficial mirrors.",
        },
        { type: "heading", level: 3, text: "Can I use one license on multiple servers?" },
        {
          type: "paragraph",
          text: "No. Licenses are tied to a single server unless you have explicit written approval. Sharing or reselling keys can trigger suspension.",
        },
        { type: "heading", level: 3, text: "Where can I get help?" },
        {
          type: "paragraph",
          text: "Use the [Help Center](/help-center), documentation, FAQs, or Discord support for help.",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  VexShield                                                                 */
/* -------------------------------------------------------------------------- */

const airshield: DocPage = {
  id: "airshield",
  title: "Overview",
  description: "What VexShield is, how it protects your FiveM server, and the key features at a glance.",
  icon: Shield,
  lastModified: "2026-06-30",
  badge: "Anticheat",
  tags: ["airshield", "anticheat", "overview", "ban", "whitelist", "detections"],
  sections: [
    {
      id: "overview",
      title: "What is VexShield?",
      icon: Shield,
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "VexShield is the core server-side anticheat for FiveM. It detects cheating behaviour in real time, applies the action you choose (ban, kick, or warn), and keeps your configuration, bans, and logs in sync with your VexShield dashboard.",
        },
        {
          type: "paragraph",
          text: "Everything is managed from one place: tune protections in the dashboard, review bans and logs, and let the resource update itself over the air without losing your data.",
        },
      ],
    },
    {
      id: "features",
      title: "Features",
      icon: Sparkles,
      blocks: [
        {
          type: "list",
          items: [
            "Configurable detections with a per-check action (ban, kick, or warn).",
            "Dashboard-managed bans, kicks, warns, and searchable logs.",
            "In-game admin menu (`/air`) with permission gating.",
            "Player and resource whitelist exemptions for legitimate scripts and staff.",
            "Over-the-air updates that preserve your local config and data files.",
          ],
        },
        {
          type: "callout",
          kind: "tip",
          title: "New to VexShield?",
          body: "Follow the pages in order: [Installation](/documentation/airshield-installation) -> [Configuration](/documentation/airshield-config) -> [Dashboard](/documentation/airshield-dashboard).",
        },
      ],
    },
    {
      id: "screenshots",
      title: "Preview",
      icon: ScanLine,
      blocks: [
        {
          type: "image",
          src: "https://zupimages.net/up/26/14/1cou.png",
          alt: "VexShield dashboard download page",
          caption: "The dashboard Download page where you fetch the latest VexShield build.",
        },
      ],
    },
  ],
};

const airshieldInstall: DocPage = {
  id: "airshield-installation",
  title: "Installation",
  description: "Download VexShield, drop it into your resources, and authenticate it with your license key.",
  icon: Rocket,
  lastModified: "2026-06-30",
  tags: ["airshield", "installation", "server.cfg", "config.lua", "setup"],
  sections: [
    {
      id: "video",
      title: "Video walkthrough",
      icon: Rocket,
      blocks: [
        {
          type: "video",
          src: "/doc.mp4",
          title: "VexShield installation walkthrough",
        },
        {
          type: "callout",
          kind: "info",
          body: "Watch the video for the full flow, then follow the written steps below to copy the exact `server.cfg` values.",
        },
      ],
    },
    {
      id: "steps",
      title: "Step-by-step",
      icon: ListChecks,
      blocks: [
        {
          type: "steps",
          steps: [
            {
              title: "Download & upload",
              description: "Download VexShield from the dashboard **Download** page and place it in your resources folder.",
              code: { language: "text", content: "resources/[local]/airshield" },
            },
            {
              title: "Configure server.cfg",
              description: "Add your server IP and license key, then ensure the resource.",
              code: {
                language: "cfg",
                content:
                  'set airshield_server_ip "your_host/vps_ip"\nset airshield_license_key "AIRSHIELD-XXXXXX-XXXXXX"\nensure airshield',
              },
            },
            {
              title: "Set the license in config.lua",
              description: "Open `config.lua` and enter the **same** key as in `server.cfg`.",
              code: { language: "lua", content: 'LicenseKey = "AIRSHIELD-XXXXXX-XXXXXX"' },
            },
            {
              title: "Start & verify",
              description:
                "Restart the server. The server should appear as online in **My Servers**, and VexShield is ready to tune from **Settings**.",
            },
          ],
        },
        {
          type: "callout",
          kind: "warning",
          title: "Keep your key private",
          body: "Never share your license key publicly or commit it to a repository. Keys are tied to your account and can be suspended if leaked.",
        },
      ],
    },
  ],
};

const airshieldConfig: DocPage = {
  id: "airshield-config",
  title: "Configuration",
  description: "License binding, admin groups, exempt groups, whitelisting legitimate scripts, and auto-restart.",
  icon: Cog,
  lastModified: "2026-06-30",
  tags: ["airshield", "config.lua", "admin groups", "exempt", "whitelist", "configuration"],
  sections: [
    {
      id: "license",
      title: "License & connection",
      icon: Lock,
      blocks: [
        {
          type: "paragraph",
          text: "`LicenseKey` in `config.lua` must match `airshield_license_key` in `server.cfg`. Both are required for the resource to authenticate with the panel and to receive over-the-air updates.",
        },
      ],
    },
    {
      id: "admin-groups",
      title: "Admin groups",
      icon: Users,
      blocks: [
        {
          type: "paragraph",
          text: "Players whose framework group is listed under **Admin Groups** in the dashboard (mapped to `Config.ADMIN_GROUPS`) can open the in-game menu without any `server.cfg` ACE lines. You can also list Discord IDs under `Airmenu` in `html/admin.json`:",
        },
        {
          type: "code",
          language: "json",
          filename: "html/admin.json",
          code: '{\n  "Airwhitelist": [],\n  "Airmenu": [\n    "414172316814147596"\n  ]\n}',
        },
      ],
    },
    {
      id: "exempt-groups",
      title: "Exempt groups & whitelisting",
      icon: ShieldCheck,
      blocks: [
        {
          type: "paragraph",
          text: "Under **Settings > Permissions & Groups > Exempt Groups** (mapped to `Config.EXEMPT_GROUPS`), list framework groups that should be skipped by relevant detections.",
        },
        {
          type: "paragraph",
          text: "If a legitimate script is being flagged, add it to the whitelist sections under **Settings** (whitelisted triggers / full whitelist resources) so it is no longer detected.",
        },
        {
          type: "callout",
          kind: "note",
          body: "Whitelisting is the correct fix for false positives - never disable an entire protection to silence one resource.",
        },
      ],
    },
    {
      id: "auto-restart",
      title: "Auto-restart after update",
      icon: RefreshCw,
      blocks: [
        {
          type: "paragraph",
          text: "To restart the resource automatically after every over-the-air update, add this to `server.cfg`:",
        },
        { type: "code", language: "cfg", code: "setr airshield_update_auto_restart 1" },
      ],
    },
  ],
};

const airshieldDashboard: DocPage = {
  id: "airshield-dashboard",
  title: "Dashboard",
  description: "Where to manage protections, bans, kicks, warns, logs, and the whitelist from the web panel.",
  icon: LayoutDashboard,
  lastModified: "2026-06-30",
  tags: ["airshield", "dashboard", "settings", "bans", "logs", "whitelist"],
  sections: [
    {
      id: "settings",
      title: "Settings & protections",
      icon: Settings,
      blocks: [
        {
          type: "paragraph",
          lead: true,
          text: "Open **Settings** for a connected server to enable or disable each protection and choose its action (ban, kick, or warn). Changes sync to the resource automatically - no restart required.",
        },
      ],
    },
    {
      id: "moderation",
      title: "Bans, kicks & warns",
      icon: ScrollText,
      blocks: [
        {
          type: "list",
          items: [
            "**Bans:** review, search, and lift bans applied by detections or staff.",
            "**Kicks & Warns:** full history with player, reason, and timestamp.",
            "**Logs:** a searchable activity feed for auditing what happened and when.",
          ],
        },
      ],
    },
    {
      id: "whitelist",
      title: "Whitelist & exemptions",
      icon: ShieldCheck,
      blocks: [
        {
          type: "paragraph",
          text: "Manage exempt players and resources from the dashboard. Use this for trusted staff or legitimate scripts that would otherwise trigger a detection.",
        },
      ],
    },
  ],
};

const airshieldMenu: DocPage = {
  id: "airshield-admin-menu",
  title: "In-game admin menu",
  description: "Open the VexShield admin panel in-game, the commands that open it, and the permissions required.",
  icon: ScrollText,
  lastModified: "2026-06-30",
  tags: ["airshield", "admin menu", "/air", "commands", "permissions", "ace"],
  sections: [
    {
      id: "commands",
      title: "Commands",
      icon: ScrollText,
      blocks: [
        {
          type: "table",
          variant: "commands",
          columns: ["Command", "Description"],
          rows: [
            ["/air", "Open the in-game VexShield admin panel."],
            ["/airmenu", "Alias for opening the admin panel."],
            ["airupdate", "Console-only. Pull and install the latest build over the air."],
          ],
        },
        {
          type: "callout",
          kind: "note",
          body: "`airupdate` only works from the server console (for example the txAdmin live console), not in-game chat.",
        },
      ],
    },
    {
      id: "permissions",
      title: "Permissions",
      icon: Fingerprint,
      blocks: [
        {
          type: "table",
          variant: "permissions",
          columns: ["Permission", "Description"],
          rows: [
            ["Airmenu.allow", "Allows a player or group to open the in-game admin menu."],
            ["Airwhitelist.allow", "Marks a player or group as exempt from applicable detections."],
          ],
        },
        {
          type: "paragraph",
          text: "Grant an ACE to a single player by their identifier:",
        },
        {
          type: "code",
          language: "cfg",
          code: "add_ace identifier.steam:110000112345678 Airwhitelist.allow allow",
        },
      ],
    },
  ],
};

const airshieldUpdates: DocPage = {
  id: "airshield-updates",
  title: "Updates & FAQ",
  description: "How over-the-air updates work, what data is preserved, and answers to common VexShield questions.",
  icon: RefreshCw,
  lastModified: "2026-06-30",
  tags: ["airshield", "update", "airupdate", "ota", "faq"],
  sections: [
    {
      id: "updating",
      title: "Updating the resource",
      icon: RefreshCw,
      blocks: [
        {
          type: "paragraph",
          text: "From the server console, pull the latest build and restart:",
        },
        { type: "code", language: "bash", code: "airupdate\nensure airshield" },
        {
          type: "callout",
          kind: "tip",
          body: "Set `setr airshield_update_auto_restart 1` in `server.cfg` to restart automatically after every update.",
        },
      ],
    },
    {
      id: "faq",
      title: "FAQ",
      icon: HelpCircle,
      blocks: [
        { type: "heading", level: 3, text: "Does updating reset my config?" },
        {
          type: "paragraph",
          text: "No. `config.lua` and the `html/*.json` data files (admin, ban, logs, whitelist) are preserved during `airupdate`.",
        },
        { type: "heading", level: 3, text: "A legitimate script is being flagged. What do I do?" },
        {
          type: "paragraph",
          text: "Add it to the whitelist sections under **Settings** (whitelisted triggers / full whitelist resources) so it is not detected. See [Configuration](/documentation/airshield-config).",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    emoji: "🚀",
    icon: Sparkles,
    pages: [introduction, requirements, installation, welcomeFaq],
  },
  {
    id: "airshield",
    label: "VexShield",
    emoji: "🛡️",
    icon: Shield,
    pages: [airshield, airshieldInstall, airshieldConfig, airshieldDashboard, airshieldMenu, airshieldUpdates],
  },
];