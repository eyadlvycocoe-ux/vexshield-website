#!/usr/bin/env node
/**
 * Prerendering script for AirCore
 * Generates static HTML for key public pages for SEO/crawler accessibility
 * Run with: node scripts/prerender.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';

const __dirname = resolve(fileURLToPath(import.meta.url), '..', '..');

const BASE_URL = 'https://aircore.xyz';
const DIST_PATH = resolve(__dirname, 'dist');
const OUTPUT_PATH = resolve(__dirname, 'dist', 'prerendered');

// Pages to prerender
const PRERENDER_ROUTES = [
  '/',
  '/pricing',
  '/documentation',
  '/help-center',
  '/faqs',
  '/terms',
  '/privacy',
  '/refund',
  '/partners',
  '/download',
  '/models',
  '/library',
  '/search',
  '/about',
  '/contact',
];

async function prerenderRoute(route) {
  try {
    // Read the index.html template
    const indexHtml = readFileSync(resolve(DIST_PATH, 'index.html'), 'utf-8');

    // For now, we'll create a basic static HTML version with the content
    // In a full implementation, this would use a headless browser or react-dom/server
    // to render the actual React components

    const staticHtml = generateStaticHtml(route);
    const outputFile = resolve(OUTPUT_PATH, route === '/' ? 'index.html' : `${route.replace(/^\//, '').replace(/\//g, '-')}.html`);

    // Ensure directory exists
    mkdirSync(dirname(outputFile), { recursive: true });

    writeFileSync(outputFile, staticHtml, 'utf-8');
    console.log(`✅ Prerendered: ${route} -> ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to prerender ${route}:`, error.message);
    return false;
  }
}

function generateStaticHtml(route) {
  const routeData = getRouteData(route);
  const canonical = `${BASE_URL}${route}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta name="robots" content="${routeData.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />

  <!-- Google Search Console Verification -->
  <meta name="google-site-verification" content="" />

  <!-- Bing Webmaster Tools Verification -->
  <meta name="msvalidate.01" content="" />

  <link rel="canonical" href="${canonical}" />

  <title>${routeData.title}</title>
  <meta name="description" content="${routeData.description}" />
  <meta name="keywords" content="${routeData.keywords || ''}" />
  <meta name="author" content="AirCore Security Team" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="${routeData.ogType || 'website'}" />
  <meta property="og:site_name" content="AirCore" />
  <meta property="og:title" content="${routeData.title}" />
  <meta property="og:description" content="${routeData.description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${routeData.ogImage || 'https://aircore.xyz/airbanner.png'}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="${routeData.ogImageAlt || routeData.title}" />

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${routeData.title}" />
  <meta name="twitter:description" content="${routeData.description}" />
  <meta name="twitter:image" content="${routeData.ogImage || 'https://aircore.xyz/airbanner.png'}" />
  <meta name="twitter:site" content="@AirCore_xyz" />

  <link rel="icon" type="image/png" sizes="512x512" href="/logo.png">
  <link rel="apple-touch-icon" href="/logo.png">

  <style>
    html, body, #root { background-color: #0a0e14; color: #f8fafc; min-height: 100vh; margin: 0; font-family: Inter, sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
    .btn-primary { background: #1e3a5f; color: white; border: none; }
    .btn-primary:hover { background: #255180; }
    .btn-outline { background: transparent; color: white; border: 1px solid #3f3f46; }
    .btn-outline:hover { background: #27272a; }
    .card { border: 1px solid #27272a; border-radius: 1rem; padding: 1.5rem; background: #18181b; }
    .grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    h1 { font-size: 2.5rem; font-weight: 900; line-height: 1.1; margin-bottom: 1rem; }
    h2 { font-size: 1.875rem; font-weight: 800; margin-bottom: 1rem; }
    h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; line-height: 1.6; margin-bottom: 1rem; }
    .text-blue { color: #3b82f6; }
    .text-center { text-align: center; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-8 { margin-top: 2rem; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .gap-4 { gap: 1rem; }
    .w-full { width: 100%; }
    .max-w-2xl { max-width: 42rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <div id="root">
    ${routeData.staticContent}
  </div>

  <!-- Static HTML fallback content for web crawlers -->
  <noscript>
    <main style="padding: 2rem; font-family: sans-serif; color: #fff; background: #080c14;">
      <h1>${routeData.title}</h1>
      <p>${routeData.description}</p>
    </main>
  </noscript>

  ${routeData.structuredData ? `<script type="application/ld+json">${JSON.stringify(routeData.structuredData)}</script>` : ''}
</body>
</html>`;
}

function getRouteData(route) {
  const commonData = {
    ogImage: 'https://aircore.xyz/airbanner.png',
    ogImageAlt: 'AirCore FiveM Security Banner',
    keywords: 'FiveM, Anticheat, FiveM Protection, AirShield, AirScanner, AirPC, AirEye, FiveM Security, AirCore',
    structuredData: null,
  };

  const routes = {
    '/': {
      title: 'AirCore — FiveM Security & Protection',
      description: 'AirCore provides security tools for FiveM servers, including AirShield anti-cheat, AirScanner security scanner, and AirPC checker.',
      ogType: 'website',
      noindex: false,
      staticContent: `
        <main class="container" style="padding: 4rem 1rem;">
          <section class="text-center max-w-2xl mx-auto mb-8">
            <h1>AirCore <span class="text-blue">FiveM Security & Protection</span></h1>
            <p class="mb-8">AirCore provides security tools for FiveM servers, including AirShield anti-cheat, AirScanner security scanner, and AirPC checker.</p>
            <div class="flex items-center justify-center gap-4 flex-wrap">
              <a href="/airshield" class="btn btn-primary">AirShield Anti-Cheat</a>
              <a href="/airscanner" class="btn btn-outline">AirScanner</a>
              <a href="/airpc" class="btn btn-outline">AirPC Checker</a>
              <a href="/pricing" class="btn btn-primary">View Pricing</a>
            </div>
          </section>
          <section class="grid mt-8">
            <article class="card">
              <h3>AirShield</h3>
              <p>Real-time FiveM anti-cheat with behavioral detection, automated bans, in-game admin menu, and web dashboard.</p>
              <a href="/airshield" class="btn btn-outline w-full mt-4">Learn More</a>
            </article>
            <article class="card">
              <h3>AirScanner</h3>
              <p>Standalone resource scanner for backdoor detection, obfuscated payload analysis, and security auditing.</p>
              <a href="/airscanner" class="btn btn-outline w-full mt-4">Learn More</a>
            </article>
            <article class="card">
              <h3>AirPC</h3>
              <p>PIN-based PC verification with forensic reports, dynamic YARA rules, and dashboard review interface.</p>
              <a href="/airpc" class="btn btn-outline w-full mt-4">Learn More</a>
            </article>
          </section>
        </main>
      `,
    },
    '/pricing': {
      title: 'Pricing — FiveM Security Plans | AirCore',
      description: 'Choose the right AirCore security plan for your FiveM server. Flexible pricing for AirShield anti-cheat, AirScanner, and AirPC.',
      ogType: 'website',
      noindex: false,
      staticContent: `
        <main class="container" style="padding: 4rem 1rem;">
          <section class="text-center max-w-2xl mx-auto mb-8">
            <h1>Pricing <span class="text-blue">Plans</span></h1>
            <p class="mb-8">Flexible pricing for AirShield anti-cheat, AirScanner security scanner, and AirPC checker. Monthly, quarterly, and lifetime options available.</p>
          </section>
          <section class="grid">
            <article class="card">
              <h3>AirShield</h3>
              <p>From €19.99/month - Real-time anti-cheat, dashboard, admin menu, ban management</p>
              <a href="/airshield/pricing" class="btn btn-outline w-full mt-4">View Details</a>
            </article>
            <article class="card">
              <h3>AirScanner</h3>
              <p>From €9.99/month - Resource scanning, backdoor detection, batch/full scans</p>
              <a href="/airscanner/pricing" class="btn btn-outline w-full mt-4">View Details</a>
            </article>
            <article class="card">
              <h3>AirPC</h3>
              <p>From €4.99/month - PIN-based scans, forensic reports, YARA rules</p>
              <a href="/airpc/pricing" class="btn btn-outline w-full mt-4">View Details</a>
            </article>
          </section>
        </main>
      `,
    },
    '/airshield': {
      title: 'AirShield — FiveM Anti-Cheat | AirCore',
      description: 'AirShield is a FiveM anti-cheat developed by AirCore. Real-time cheat detection, automated bans, in-game admin menu, and dashboard management for FiveM server protection.',
      ogType: 'website',
      noindex: false,
      staticContent: `
        <main class="container" style="padding: 4rem 1rem;">
          <section class="text-center max-w-2xl mx-auto mb-8">
            <h1>AirShield <span class="text-blue">FiveM Anti-Cheat</span></h1>
            <p class="mb-8">Real-time cheat detection, automated bans, in-game admin menu, and comprehensive dashboard management for FiveM server protection.</p>
            <div class="flex items-center justify-center gap-4 flex-wrap">
              <a href="/pricing" class="btn btn-primary">View Pricing</a>
              <a href="/documentation/airshield-installation" class="btn btn-outline">Documentation</a>
              <a href="/airshield/faq" class="btn btn-outline">FAQ</a>
            </div>
          </section>
          <section class="grid mt-8">
            <article class="card"><h3>Real-Time Detection</h3><p>Heuristic analysis detects cheats, exploits, and unauthorized events without server lag.</p></article>
            <article class="card"><h3>Automated Bans</h3><p>Configurable actions (ban/kick/warn) with full dashboard for review and management.</p></article>
            <article class="card"><h3>Admin Menu</h3><p>In-game /air panel with permission gating, player management, live controls.</p></article>
            <article class="card"><h3>Whitelisting</h3><p>Exempt legitimate scripts and trusted staff from detections via dashboard.</p></article>
            <article class="card"><h3>OTA Updates</h3><p>airupdate command preserves configs and data files during updates.</p></article>
            <article class="card"><h3>Hardware Fingerprinting</h3><p>Prevents ban evasion through account switching or VPN usage.</p></article>
          </section>
        </main>
      `,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'AirShield',
        description: 'AirShield is a FiveM anti-cheat developed by AirCore. It detects cheating behavior in real time, applies configurable actions (ban, kick, warn), and provides a web dashboard for ban management, logs, and configuration.',
        url: 'https://aircore.xyz/airshield',
        applicationCategory: 'SecurityApplication',
        operatingSystem: 'Windows, Linux (FiveM FXServer)',
        author: { '@type': 'Organization', name: 'AirCore', url: 'https://aircore.xyz' },
        offers: [{ '@type': 'Offer', price: '19.99', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: 'https://aircore.xyz/pricing' }],
      },
    },
    '/airscanner': {
      title: 'AirScanner — FiveM Security Scanner | AirCore',
      description: 'AirScanner is a FiveM resource scanner by AirCore. Detects backdoors, obfuscated payloads, and malicious patterns in server resources. Dashboard reporting with severity levels.',
      ogType: 'website',
      noindex: false,
      staticContent: `
        <main class="container" style="padding: 4rem 1rem;">
          <section class="text-center max-w-2xl mx-auto mb-8">
            <h1>AirScanner <span class="text-blue">FiveM Security Scanner</span></h1>
            <p class="mb-8">Standalone resource scanner for FiveM servers. Detects backdoors, obfuscated payloads, and malicious patterns. Real-time dashboard reporting with severity levels.</p>
            <div class="flex items-center justify-center gap-4 flex-wrap">
              <a href="/pricing" class="btn btn-primary">View Pricing</a>
              <a href="/documentation/airscanner-installation" class="btn btn-outline">Documentation</a>
            </div>
          </section>
          <section class="grid mt-8">
            <article class="card"><h3>Signature Detection</h3><p>Extensive signature database for backdoors, obfuscated payloads, malicious patterns.</p></article>
            <article class="card"><h3>Dashboard Reports</h3><p>Real-time streaming with severity levels, evidence, resource identification.</p></article>
            <article class="card"><h3>Console Commands</h3><p>airscan, airscan status - trigger and monitor scans from server console.</p></article>
            <article class="card"><h3>Independent</h3><p>Runs separately from AirShield, shares server ID and license key.</p></article>
          </section>
        </main>
      `,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'AirScanner',
        description: 'AirScanner is a standalone resource scanner for FiveM servers. It scans server resources for suspicious signatures including backdoors, obfuscated payloads, and known malicious patterns, reporting findings to the dashboard.',
        url: 'https://aircore.xyz/airscanner',
        applicationCategory: 'SecurityApplication',
        operatingSystem: 'Windows, Linux (FiveM FXServer)',
        author: { '@type': 'Organization', name: 'AirCore', url: 'https://aircore.xyz' },
        offers: [{ '@type': 'Offer', price: '9.99', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: 'https://aircore.xyz/pricing' }],
      },
    },
    '/airpc': {
      title: 'AirPC — FiveM PC Checker | AirCore',
      description: 'AirPC (PCChecker) is a FiveM PC verification tool by AirCore. Generate scan PINs, players run lightweight client, forensic reports reviewed in dashboard with verdicts and evidence.',
      ogType: 'website',
      noindex: false,
      staticContent: `
        <main class="container" style="padding: 4rem 1rem;">
          <section class="text-center max-w-2xl mx-auto mb-8">
            <h1>AirPC <span class="text-blue">FiveM PC Checker</span></h1>
            <p class="mb-8">PIN-based client scans with forensic reports. Generate scan PINs, players run lightweight client, staff reviews detailed forensic reports with verdicts and evidence in the dashboard.</p>
            <div class="flex items-center justify-center gap-4 flex-wrap">
              <a href="/pricing" class="btn btn-primary">View Pricing</a>
              <a href="/documentation/pcchecker-setup" class="btn btn-outline">Documentation</a>
            </div>
          </section>
          <section class="grid mt-8">
            <article class="card"><h3>Named Scan PINs</h3><p>Unique PINs per player/ticket/case with descriptive names for organization.</p></article>
            <article class="card"><h3>Public Download Links</h3><p>Simple URLs (aircore.xyz/scan/:pinCode) - no authentication needed for players.</p></article>
            <article class="card"><h3>Forensic Reports</h3><p>Verdict (clean/suspicious/malicious), screenshots, processes, hardware info.</p></article>
            <article class="card"><h3>Dynamic YARA Rules</h3><p>Detection rules served via API - update without redistributing client.</p></article>
          </section>
        </main>
      `,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'AirPC',
        description: 'AirPC (PCChecker) generates scan PINs for FiveM players. Players run a lightweight client that uploads a forensic report including hardware info, running processes, and detection verdicts for staff review.',
        url: 'https://aircore.xyz/airpc',
        applicationCategory: 'SecurityApplication',
        operatingSystem: 'Windows (Client), Windows/Linux (FiveM FXServer)',
        author: { '@type': 'Organization', name: 'AirCore', url: 'https://aircore.xyz' },
        offers: [{ '@type': 'Offer', price: '4.99', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: 'https://aircore.xyz/pricing' }],
      },
    },
  };

  // Sub-pages use the parent product page data with modifications
  const subPageData = {
    '/airshield/features': { ...routes['/airshield'], title: 'AirShield Features — FiveM Anti-Cheat Protection | AirCore', description: 'Explore AirShield features: real-time behavioral detection, server-side event authentication, automated bans, in-game admin menu, player whitelisting, and over-the-air updates.' },
    '/airshield/pricing': { ...routes['/airshield'], title: 'AirShield Pricing — FiveM Anti-Cheat Plans | AirCore', description: 'AirShield pricing plans: monthly, quarterly, and lifetime licenses. Includes dashboard access, updates, and support.' },
    '/airshield/docs': { ...routes['/airshield'], title: 'AirShield Documentation — Installation & Configuration | AirCore', description: 'Complete AirShield documentation: installation guide, configuration, admin menu commands, dashboard settings, whitelisting, and updates.' },
    '/airshield/faq': { ...routes['/airshield'], title: 'AirShield FAQ — Common Questions | AirCore', description: 'Frequently asked questions about AirShield anti-cheat: installation, compatibility, licensing, detections, and troubleshooting.' },
    '/airshield/security': { ...routes['/airshield'], title: 'AirShield Security — Protection Details | AirCore', description: 'Learn about AirShield security architecture: heuristic scanning, memory protection, hardware fingerprinting, global ban network, and encryption.' },
    '/airshield/changelog': { ...routes['/airshield'], title: 'AirShield Changelog — Updates & Releases | AirCore', description: 'AirShield changelog with all updates, new detections, bug fixes, and feature releases.' },
    '/airscanner/features': { ...routes['/airscanner'], title: 'AirScanner Features — FiveM Resource Scanner | AirCore', description: 'AirScanner features: signature-based backdoor detection, obfuscated payload analysis, batch scanning, full server scans, and dashboard reporting with severity levels.' },
    '/airscanner/pricing': { ...routes['/airscanner'], title: 'AirScanner Pricing — FiveM Security Scanner Plans | AirCore', description: 'AirScanner pricing: monthly, quarterly, and lifetime licenses for FiveM resource scanning and backdoor detection.' },
    '/airscanner/docs': { ...routes['/airscanner'], title: 'AirScanner Documentation — Installation & Scanning | AirCore', description: 'AirScanner documentation: installation, scanning commands (airscan), report types, severity levels, API endpoints, and troubleshooting.' },
    '/airpc/features': { ...routes['/airpc'], title: 'AirPC Features — FiveM PC Verification | AirCore', description: 'AirPC features: named scan PINs, public download links, forensic reports with verdicts, evidence screenshots, analyst feedback, and dynamic YARA rules.' },
    '/airpc/pricing': { ...routes['/airpc'], title: 'AirPC Pricing — FiveM PC Checker Plans | AirCore', description: 'AirPC pricing plans: monthly, quarterly, and lifetime licenses for PC verification and forensic scanning.' },
    '/airpc/docs': { ...routes['/airpc'], title: 'AirPC Documentation — Setup & Reports | AirCore', description: 'AirPC documentation: creating scan PINs, sharing download links, reviewing forensic reports, API endpoints, YARA rules, and permissions.' },
  };

  // Merge sub-page data
  const allRoutes = { ...routes, ...subPageData };

  // Default for other pages
  const defaultData = {
    title: 'AirCore — FiveM Security & Protection',
    description: 'AirCore provides security tools for FiveM servers, including AirShield anti-cheat, AirScanner security scanner, and AirPC checker.',
    ogType: 'website',
    noindex: false,
    staticContent: `<main class="container" style="padding: 4rem 1rem;"><section class="text-center max-w-2xl mx-auto"><h1>AirCore</h1><p>FiveM Security & Protection</p></section></main>`,
  };

  return allRoutes[route] || defaultData;
}

async function main() {
  console.log('🚀 Starting prerendering for AirCore...\n');

  // Create output directory
  if (!existsSync(OUTPUT_PATH)) {
    mkdirSync(OUTPUT_PATH, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const route of PRERENDER_ROUTES) {
    const result = await prerenderRoute(route);
    if (result) success++;
    else failed++;
  }

  console.log(`\n📊 Prerendering complete: ${success} succeeded, ${failed} failed`);
  console.log(`📁 Output directory: ${OUTPUT_PATH}`);
}

main().catch(console.error);