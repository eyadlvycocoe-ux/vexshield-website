#!/usr/bin/env node
/**
 * Sitemap Generator for AirCore
 * Generates a comprehensive mysite.xml with all public, indexable routes
 * Run with: node scripts/generate-sitemap.mjs
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEBSITE_ROOT = resolve(__dirname, '..');

const BASE_URL = process.env.SITE_BASE || 'https://aircore.xyz';
const OUTPUT_PATH = resolve(WEBSITE_ROOT, 'public', 'mysite.xml');

// Current date for lastmod
const TODAY = new Date().toISOString().split('T')[0];

// Static public routes with their metadata (unfoundable/dead routes removed)
const staticRoutes = [
  {
    url: '/',
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 1.0,
    images: [
      { loc: `${BASE_URL}/logo.png`, title: 'AirCore FiveM Protection Suite Logo', caption: 'Unified FiveM Security System' },
      { loc: `${BASE_URL}/airbanner.png`, title: 'AirCore FiveM Security Banner', caption: 'AirCore Protection Suite Overview' },
    ],
  },
  {
    url: '/pricing',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.9,
  },
  {
    url: '/documentation',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.9,
  },
  {
    url: '/help-center',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    url: '/faqs',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    url: '/terms',
    lastmod: TODAY,
    changefreq: 'yearly',
    priority: 0.4,
  },
  {
    url: '/privacy',
    lastmod: TODAY,
    changefreq: 'yearly',
    priority: 0.4,
  },
  {
    url: '/refund',
    lastmod: TODAY,
    changefreq: 'yearly',
    priority: 0.4,
  },
  {
    url: '/partners',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    url: '/download',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    url: '/models',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    url: '/library',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    url: '/configs-library',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    url: '/search',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.5,
  },
  {
    url: '/about',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    url: '/contact',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
  },
];

// Active documentation pages from DOC_CATEGORIES
const docPages = [
  // Getting Started
  'introduction',
  'requirements',
  'installation',
  'faq',
  // AirShield
  'airshield',
  'airshield-installation',
  'airshield-config',
  'airshield-dashboard',
  'airshield-admin-menu',
  'airshield-updates',
  // AirEye
  'aireye',
  'aireye-setup',
  'aireye-commands',
  'aireye-check-user',
];

function generateDocRoutes() {
  return docPages.map(pageId => ({
    url: `/documentation/${pageId}`,
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
  }));
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemap() {
  const allRoutes = [
    ...staticRoutes,
    ...generateDocRoutes(),
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
  xml += '\n';

  for (const route of allRoutes) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(`${BASE_URL}${route.url}`)}</loc>\n`;
    xml += `    <lastmod>${route.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority.toFixed(1)}</priority>\n`;

    if (route.images && route.images.length > 0) {
      for (const image of route.images) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
        if (image.title) xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
        if (image.caption) xml += `      <image:caption>${escapeXml(image.caption)}</image:caption>\n`;
        xml += '    </image:image>\n';
      }
    }

    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  writeFileSync(OUTPUT_PATH, xml, 'utf-8');
  console.log(`✅ Sitemap successfully generated at ${OUTPUT_PATH}`);
  console.log(`📄 Total URLs: ${allRoutes.length}`);
  console.log(`🏠 Static routes: ${staticRoutes.length}`);
  console.log(`📚 Documentation routes: ${docPages.length}`);
  console.log(`📅 Lastmod: ${TODAY}`);
}

generateSitemap();