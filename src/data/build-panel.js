import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = 'D:\\websiteAirShield\\AirShield\\html\\ac-air_index.html';
const destPath = path.join(__dirname, 'ingamePanelHtml.ts');
const publicDestPath = path.join(__dirname, '../../public/ingame-panel.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Define dummy GetParentResourceName in <head> so FiveM native check passes without ReferenceError
const dummyGetParentScript = `<script>window.GetParentResourceName = window.GetParentResourceName || function() { return 'airshield'; };</script>`;
if (!html.includes('window.GetParentResourceName')) {
  html = html.replace('<head>', '<head>\n    ' + dummyGetParentScript);
}

// 2. Remove the Access Denied block so web demo mode loads the full UI
html = html.replace(
  /if\s*\(\!isFiveM\)\s*\{\s*\$\('body'\)\.html\(['"][^'"]*Access Denied[^'"]*['"]\);\s*return;\s*\}/gi,
  "/* Web demo mode enabled - Access Denied check bypassed */"
);

// 3. Override nuiPost so all actions in web demo mode return instant success Promise with text/json helpers
html = html.replace(
  /const nuiPost = \(endpoint, data = \{\}\) => \{[\s\S]*?\};/m,
  "const nuiPost = (endpoint, data = {}) => Promise.resolve({ dev: true, ok: true, text: () => Promise.resolve('[]'), json: () => Promise.resolve([]) });"
);

// Helpers to read and safely inline JS/CSS using Base64 atob micro-wrappers
function getAtobScriptTag(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString('base64');
  return `<script>(function(){try{var c=atob("${b64}");var s=document.createElement('script');s.textContent=c;(document.head||document.documentElement).appendChild(s);}catch(e){console.error(e);}})();</script>`;
}

function getSafeInlineStyle(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

const vendorDir = path.join(__dirname, '../../public/vendor');
const jqueryTag = getAtobScriptTag(path.join(vendorDir, 'jquery.min.js'));
const tailwindTag = getAtobScriptTag(path.join(vendorDir, 'tailwindcss.js'));
const peerjsTag = getAtobScriptTag(path.join(vendorDir, 'peerjs.min.js'));
const boxiconsCss = getSafeInlineStyle(path.join(vendorDir, 'boxicons.min.css'));
const animateCss = getSafeInlineStyle(path.join(vendorDir, 'animate.min.css'));

// Auto-open script with rich demo data, instant tab switching, and link click interceptor
const autoOpenScript = `
<script>
    // Intercept default link clicks to prevent iframe navigation while guaranteeing instant tab switching
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a');
        if (a) {
            var href = a.getAttribute('href');
            if (!href || href === '#' || href.startsWith('/') || href.startsWith('http') || href.startsWith('javascript:')) {
                e.preventDefault();
            }
            // Directly handle sidebar navigation instantly on click
            var li = a.closest('li[data-name]');
            if (li) {
                var targetName = li.getAttribute('data-name');
                if (targetName && typeof navigate === 'function') {
                    navigate(targetName);
                }
            }
        }
    }, true);

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            if (typeof $ !== 'undefined') {
                $('#initial-loading').hide();
                const container = $('#container');
                container.css({ display: 'block', opacity: '1', transform: 'translateY(0px)' }).removeClass('panel-opening');
                
                var homeLi = $('#sidebar li[data-name="home"]');
                if (homeLi.length) {
                    if (typeof navigate === 'function') navigate('home');
                } else {
                    $('.page').removeClass('hide');
                    $('.apex-topbar').removeClass('hide');
                }

                // Pre-populate mock data instantly for all tabs to ensure 0ms tab switching lag
                if ($('#stat-connections').text() === '0') $('#stat-connections').text('1 247');
                if ($('#stat-total-players').text() === '0') $('#stat-total-players').text('15 823');
                if ($('#metric-banned').text() === '0') $('#metric-banned').text('89');
                if ($('#metric-current').text() === '0' || $('#metric-current').text() === '') $('#metric-current').text('256');
                if ($('#metric-capacity').text() === '0' || $('#metric-capacity').text() === '--') $('#metric-capacity').text('300');
                if ($('#topbar-uptime').text() === '0h 00m') $('#topbar-uptime').text('14h 32m');

                const mockPlayers = [
                    { id: 1, name: "ProGamer2024", ping: 23, discord: "123456789012345678", isAdmin: false },
                    { id: 2, name: "RacingKing_99", ping: 45, discord: "234567890123456789", isAdmin: false },
                    { id: 3, name: "NightRider_RP", ping: 67, discord: "345678901234567890", isAdmin: true },
                    { id: 4, name: "SilentStorm", ping: 34, discord: "456789012345678901", isAdmin: false },
                    { id: 5, name: "PhoenixX_FiveM", ping: 89, discord: "567890123456789012", isAdmin: false },
                    { id: 6, name: "ShadowHunter", ping: 28, discord: "678901234567890123", isAdmin: false },
                    { id: 7, name: "ViperSquad", ping: 52, discord: "789012345678901234", isAdmin: false },
                    { id: 8, name: "ApexPredator", ping: 41, discord: "890123456789012345", isAdmin: true },
                ];
                if (typeof renderPlayers === 'function') renderPlayers(mockPlayers);

                const mockBans = [
                    { id: "air-101", name: "Hacker_X99", reason: "Anti Noclip Detection #4", banned_at: Math.floor(Date.now()/1000 - 3600), type: "Anticheat" },
                    { id: "air-102", name: "SpeedDemon", reason: "Anti Speedhack (Vehicle multiplier > 4.5)", banned_at: Math.floor(Date.now()/1000 - 7200), type: "Anticheat" },
                    { id: "air-103", name: "GodmodeUser", reason: "Health lock / Godmode bypass", banned_at: Math.floor(Date.now()/1000 - 14400), type: "Anticheat" },
                    { id: "air-104", name: "WeaponSpawner", reason: "Unauthorized weapon give: WEAPON_RPG", banned_at: Math.floor(Date.now()/1000 - 86400), type: "Anticheat" },
                    { id: "air-105", name: "TrollPlayer33", reason: "Mass server RDM / Toxic behavior", banned_at: Math.floor(Date.now()/1000 - 172800), type: "Manual" },
                ];
                window.allBans = mockBans;
                if (typeof renderBans === 'function') renderBans(mockBans);

                const mockLogs = [
                    { type: "BAN_PLAYER", player: "Hacker_X99", details: "Banned for Anti Noclip Detection", admin: "AirShield AC", ts: Math.floor(Date.now()/1000 - 120) },
                    { type: "KICK_PLAYER", player: "SuspectPlayer", details: "Kicked for High Ping (340ms)", admin: "System", ts: Math.floor(Date.now()/1000 - 600) },
                    { type: "EXPLOSION", player: "UnknownExploder", details: "Blocked invalid explosion type 29", admin: "AirShield AC", ts: Math.floor(Date.now()/1000 - 1500) },
                    { type: "TELEPORT", player: "FastTraveler", details: "Distance delta > 500m in 1s", admin: "AirShield AC", ts: Math.floor(Date.now()/1000 - 2400) },
                    { type: "WEAPON", player: "GunGiver", details: "Quarantined blacklisted weapon ammo", admin: "AirShield AC", ts: Math.floor(Date.now()/1000 - 3600) },
                    { type: "PLAYER_JOIN", player: "ProGamer2024", details: "Joined from 127.0.0.1", admin: "Server", ts: Math.floor(Date.now()/1000 - 4200) },
                ];
                window.lastLogs = mockLogs;
                if (typeof renderLogs === 'function') renderLogs(mockLogs);

                const mockAdmins = [
                    { name: "Gizmo (Owner)", points: 1420, bans: 42, unbans: 5, reports: 68 },
                    { name: "Alex (Head Admin)", points: 980, bans: 28, unbans: 3, reports: 45 },
                    { name: "Sarah (Senior Admin)", points: 750, bans: 19, unbans: 1, reports: 32 },
                ];
                if (typeof renderAdmins === 'function') renderAdmins(mockAdmins);

                // Override fetch functions to return cached mock data instantly without async delay
                window.fetchBanList = function(cb) { if(cb) cb(mockBans); };
                window.fetchLogs = function(cb) { if(cb) cb(mockLogs); };
                window.loadHomePageData = function() {};
            }
        }, 50);
    });
</script>
`;

if (!html.includes('Populate rich mock data')) {
  html = html.replace('</html>', autoOpenScript + '</html>');
}

// Base64 inlined version for INGAME_PANEL_HTML (bypasses CSP network blocks & HTML parser glitches)
let inlinedHtml = html
  .replace(
    /<script[^>]*src="[^"]*jquery[^"]*"[^>]*><\/script>/gi,
    jqueryTag
  )
  .replace(
    /<script[^>]*src="[^"]*tailwindcss[^"]*"[^>]*><\/script>/gi,
    tailwindTag
  )
  .replace(
    /<script[^>]*src="[^"]*peerjs[^"]*"[^>]*><\/script>/gi,
    peerjsTag
  )
  .replace(
    /<link[^>]*href="[^"]*boxicons[^"]*"[^>]*>/gi,
    `<style>${boxiconsCss}</style>`
  )
  .replace(
    /<link[^>]*href="[^"]*animate[^"]*"[^>]*>/gi,
    `<style>${animateCss}</style>`
  );

// For public/ingame-panel.html, keep clean local vendor script tags
let publicHtml = html
  .replace(
    /<script[^>]*src="[^"]*jquery[^"]*"[^>]*><\/script>/gi,
    '<script src="/vendor/jquery.min.js"></script>'
  )
  .replace(
    /<script[^>]*src="[^"]*tailwindcss[^"]*"[^>]*><\/script>/gi,
    '<script src="/vendor/tailwindcss.js"></script>'
  )
  .replace(
    /<script[^>]*src="[^"]*peerjs[^"]*"[^>]*><\/script>/gi,
    '<script src="/vendor/peerjs.min.js"></script>'
  )
  .replace(
    /<link[^>]*href="[^"]*boxicons[^"]*"[^>]*>/gi,
    '<link rel="stylesheet" href="/vendor/boxicons.min.css">'
  )
  .replace(
    /<link[^>]*href="[^"]*animate[^"]*"[^>]*>/gi,
    '<link rel="stylesheet" href="/vendor/animate.min.css">'
  );

fs.writeFileSync(publicDestPath, publicHtml, 'utf8');

const fileContent = `export const INGAME_PANEL_HTML = ${JSON.stringify(inlinedHtml)};\n`;
fs.writeFileSync(destPath, fileContent, 'utf8');

console.log('Successfully generated ingamePanelHtml.ts (' + fileContent.length + ' bytes) and public/ingame-panel.html (' + publicHtml.length + ' bytes)');
