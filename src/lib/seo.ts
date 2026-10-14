import type { ReactNode } from 'react';

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string;
  twitterCreator?: string;
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: object | object[];
  customMeta?: Record<string, string>;
}

export interface ProductSEOProps extends SEOProps {
  productName: string;
  productCategory: string;
  price?: string;
  priceCurrency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  sku?: string;
  offers?: {
    price: string;
    priceCurrency: string;
    availability: string;
    url: string;
  }[];
}

export interface ArticleSEOProps extends SEOProps {
  articleTitle: string;
  articleDescription: string;
  authorName?: string;
  authorUrl?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbSEOProps {
  breadcrumbs: BreadcrumbItem[];
}

const DEFAULT_OG_IMAGE = 'https://vexshield.com/logo.png';
const DEFAULT_TWITTER_CARD = 'summary_large_image';
const SITE_NAME = 'VexShield';
const BASE_URL = 'https://vexshield.com';

export function generateCanonicalUrl(path: string): string {
  const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  return `${BASE_URL}${cleanPath}`;
}

export function generateBaseSEO(props: SEOProps) {
  const canonical = props.canonical || generateCanonicalUrl(window.location.pathname);
  const ogImage = props.ogImage || DEFAULT_OG_IMAGE;
  const twitterCard = props.twitterCard || DEFAULT_TWITTER_CARD;

  return {
    title: props.title,
    description: props.description,
    canonical,
    meta: [
      { name: 'robots', content: `${props.noindex ? 'noindex' : 'index'}, ${props.nofollow ? 'nofollow' : 'follow'}` },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { property: 'og:type', content: props.ogType || 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: props.title },
      { property: 'og:description', content: props.description },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: ogImage },
      { property: 'og:image:width', content: String(props.ogImageWidth || 1200) },
      { property: 'og:image:height', content: String(props.ogImageHeight || 630) },
      { property: 'og:image:alt', content: props.ogImageAlt || props.title },
      { property: 'og:locale', content: 'en_US' },
      { name: 'twitter:card', content: twitterCard },
      { name: 'twitter:title', content: props.title },
      { name: 'twitter:description', content: props.description },
      { name: 'twitter:image', content: ogImage },
      { name: 'twitter:site', content: props.twitterSite || '@VexShield_xyz' },
    ],
    link: [
      { rel: 'canonical', href: canonical },
    ],
    structuredData: props.structuredData,
    customMeta: props.customMeta,
  };
}

export function generateProductStructuredData(props: ProductSEOProps) {
  const canonical = props.canonical || generateCanonicalUrl(window.location.pathname);
  const offers = props.offers || (props.price ? [{
    '@type': 'Offer',
    price: props.price,
    priceCurrency: props.priceCurrency || 'EUR',
    availability: `https://schema.org/${props.availability || 'InStock'}`,
    url: canonical,
  }] : []);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: props.productName,
    description: props.description,
    brand: {
      '@type': 'Brand',
      name: props.brand || 'VexShield',
    },
    category: props.productCategory,
    sku: props.sku,
    image: props.ogImage || DEFAULT_OG_IMAGE,
    url: canonical,
    offers: offers.map(offer => ({
      '@type': 'Offer',
      ...offer,
    })),
  };
}

export function generateSoftwareApplicationStructuredData(props: {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: { price: string; priceCurrency: string; availability: string; url: string }[];
  author?: { name: string; url: string };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: props.name,
    description: props.description,
    url: props.url,
    applicationCategory: props.applicationCategory || 'SecurityApplication',
    operatingSystem: props.operatingSystem || 'Windows, Linux (FiveM FXServer)',
    author: props.author ? {
      '@type': 'Organization',
      name: props.author.name,
      url: props.author.url,
    } : undefined,
    offers: props.offers?.map(offer => ({
      '@type': 'Offer',
      ...offer,
    })),
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VexShield',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description: 'VexShield develops premier anticheat security and protection products for FiveM servers.',
    sameAs: [
      'https://discord.gg/5WgtMWbtgD',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '',
      contactType: 'customer support',
      availableLanguage: ['English'],
      url: `${BASE_URL}/help-center`,
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MA',
    },
  };
}

export function generateWebSiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'VexShield - FiveM Anticheat & Protection',
    description: 'VexShield provides premier anticheat security and real-time protection for FiveM servers.',
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateBreadcrumbStructuredData(breadcrumbs: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : generateCanonicalUrl(item.url),
    })),
  };
}

export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateArticleStructuredData(props: ArticleSEOProps) {
  const canonical = props.canonical || generateCanonicalUrl(window.location.pathname);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.articleTitle,
    description: props.articleDescription,
    image: props.ogImage || DEFAULT_OG_IMAGE,
    author: props.authorName ? {
      '@type': 'Person',
      name: props.authorName,
      url: props.authorUrl,
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    datePublished: props.publishedTime,
    dateModified: props.modifiedTime || props.publishedTime,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    articleSection: props.section,
    keywords: props.tags?.join(', '),
  };
}

export const PAGE_METADATA: Record<string, SEOProps> = {
  '/': {
    title: 'VexShield — FiveM Security & Protection',
    description: 'VexShield provides security tools for FiveM servers, including VexShield anti-cheat and AirEye Discord bot.',
    canonical: 'https://vexshield.com/',
    ogImage: 'https://vexshield.com/airbanner.png',
    ogImageAlt: 'VexShield FiveM Security Banner - Unified Protection Suite',
    structuredData: [
      generateOrganizationStructuredData(),
      generateWebSiteStructuredData(),
    ],
  },
  '/pricing': {
    title: 'Pricing — FiveM Security Plans | VexShield',
    description: 'Choose the right VexShield security plan for your FiveM server. Flexible pricing for VexShield anti-cheat.',
    structuredData: [
      generateOrganizationStructuredData(),
    ],
  },
  '/documentation': {
    title: 'Documentation — VexShield FiveM Security Guides',
    description: 'Complete documentation for VexShield products: VexShield installation, configuration, and AirEye Discord bot.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Documentation', url: '/documentation' },
      ]),
    ],
  },
  '/help-center': {
    title: 'Help Center & Support — VexShield',
    description: 'Get help with VexShield products. Access Discord support, documentation, FAQs, and contact information for VexShield and AirEye.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Help Center', url: '/help-center' },
      ]),
    ],
  },
  '/air-eye': {
    title: 'AirEye — FiveM Discord Bot | VexShield',
    description: 'AirEye is a Discord bot for FiveM server administrators. Receive real-time detection alerts, run player lookups, and manage bans from Discord.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateSoftwareApplicationStructuredData({
        name: 'AirEye',
        description: 'Discord bot for FiveM server administrators providing real-time detection alerts, player lookups, and remote moderation commands.',
        url: 'https://vexshield.com/air-eye',
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Discord (Web, Desktop, Mobile)',
        author: { name: 'VexShield', url: BASE_URL },
      }),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'AirEye', url: '/air-eye' },
      ]),
    ],
  },
  '/faqs': {
    title: 'Frequently Asked Questions — VexShield',
    description: 'Find answers to common questions about VexShield products, licensing, installation, billing, and support.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateFAQStructuredData([
        {
          question: 'What is VexShield?',
          answer: 'VexShield is a FiveM anti-cheat developed by VexShield. It protects FiveM servers against cheats, exploits, unauthorized events, and suspicious player activity in real-time.',
        },
        {
          question: 'What is VexShield?',
          answer: 'VexShield is a Moroccan development team that creates security products for FiveM servers, including VexShield anti-cheat and AirEye Discord bot.',
        },
        {
          question: 'Does VexShield support Qbox and ESX frameworks?',
          answer: 'Yes, VexShield supports all major FiveM frameworks including Qbox, ESX, QBCore, and standalone servers.',
        },
        {
          question: 'How do I install VexShield?',
          answer: 'Connect your server in the VexShield dashboard, download VexShield from the Download page, place it in your resources folder, add your license key to server.cfg and config.lua, then ensure the resource.',
        },
        {
          question: 'How can I contact VexShield support?',
          answer: 'You can contact VexShield through Discord at https://discord.gg/5WgtMWbtgD or via email at contact@vexshield.com',
        },
      ]),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'FAQs', url: '/faqs' },
      ]),
    ],
  },
  '/terms': {
    title: 'Terms of Service — VexShield',
    description: 'Terms of Service for VexShield products and services including VexShield and AirEye.',
    noindex: true,
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Terms', url: '/terms' },
      ]),
    ],
  },
  '/privacy': {
    title: 'Privacy Policy — VexShield',
    description: 'Privacy Policy explaining how VexShield collects, uses, and protects your data across all products and services.',
    noindex: true,
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Privacy', url: '/privacy' },
      ]),
    ],
  },
  '/refund': {
    title: 'Refund & Cancellation Policy — VexShield',
    description: 'Refund and cancellation policy for VexShield products and services.',
    noindex: true,
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Refund Policy', url: '/refund' },
      ]),
    ],
  },
  '/partners': {
    title: 'Partners Program — VexShield',
    description: 'Join the VexShield Partners Program. Showcase your FiveM server, get featured, and access partner benefits.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Partners', url: '/partners' },
      ]),
    ],
  },
  '/download': {
    title: 'Download VexShield — VexShield FiveM Anti-Cheat',
    description: 'Download VexShield anti-cheat for your FiveM server. Requires an active license.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Download', url: '/download' },
      ]),
    ],
  },
  '/models': {
    title: 'AI Models — VexShield',
    description: 'Explore VexShield AI models and detection systems for FiveM server security.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'AI Models', url: '/models' },
      ]),
    ],
  },
  '/library': {
    title: 'Config Library — VexShield',
    description: 'Browse and share VexShield configurations, detection rules, and whitelist presets.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Config Library', url: '/library' },
      ]),
    ],
  },
  '/search': {
    title: 'Search — VexShield',
    description: 'Search VexShield documentation, products, and resources.',
    noindex: true,
    structuredData: [
      generateOrganizationStructuredData(),
    ],
  },
  '/about': {
    title: 'About VexShield — FiveM Security Company',
    description: 'VexShield is a Moroccan development team creating security products for FiveM servers: AirEye Discord bot.',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' },
      ]),
    ],
  },
  '/contact': {
    title: 'Contact VexShield — Support & Inquiries',
    description: 'Contact VexShield for support, sales, or partnership inquiries. Discord: https://discord.gg/5WgtMWbtgD, Email: contact@vexshield.com',
    structuredData: [
      generateOrganizationStructuredData(),
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Contact', url: '/contact' },
      ]),
    ],
  },
};

export function getPageMetadata(path: string): SEOProps | undefined {
  const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  return PAGE_METADATA[cleanPath];
}