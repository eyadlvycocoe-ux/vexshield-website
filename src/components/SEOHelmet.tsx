import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getPageMetadata, generateCanonicalUrl } from '@/lib/seo';
import { useTranslation } from 'react-i18next';

export function SEOHelmet() {
  const location = useLocation();
  const { t } = useTranslation();
  const metadata = getPageMetadata(location.pathname);

  if (!metadata) {
    const canonical = generateCanonicalUrl(location.pathname);
    return (
      <Helmet>
        <html lang="en" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="VexShield" />
        <meta property="og:title" content="VexShield — FiveM Anticheat & Protection" />
        <meta property="og:description" content="VexShield provides premier anticheat security and real-time protection for FiveM servers." />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://vexshield.com/logo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VexShield — FiveM Anticheat & Protection" />
        <meta name="twitter:description" content="VexShield provides premier anticheat security and real-time protection for FiveM servers." />
        <meta name="twitter:image" content="https://vexshield.com/logo.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': 'https://vexshield.com/#website',
            url: 'https://vexshield.com/',
            name: 'VexShield - FiveM Anticheat & Protection',
            description: 'VexShield provides premier anticheat security and real-time protection for FiveM servers.',
            inLanguage: 'en-US',
          })}
        </script>
      </Helmet>
    );
  }

  const canonical = metadata.canonical || generateCanonicalUrl(location.pathname);

  const structuredData = metadata.structuredData
    ? (Array.isArray(metadata.structuredData) ? metadata.structuredData : [metadata.structuredData])
    : [];

  return (
    <Helmet>
      <html lang="en" />
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      <meta name="robots" content={metadata.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={metadata.ogType || 'website'} />
      <meta property="og:site_name" content="VexShield" />
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={metadata.ogImage || 'https://vexshield.com/logo.png'} />
      <meta property="og:image:width" content={String(metadata.ogImageWidth || 1200)} />
      <meta property="og:image:height" content={String(metadata.ogImageHeight || 630)} />
      <meta property="og:image:alt" content={metadata.ogImageAlt || metadata.title} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content={metadata.twitterCard || 'summary_large_image'} />
      <meta name="twitter:title" content={metadata.title} />
      <meta name="twitter:description" content={metadata.description} />
      <meta name="twitter:image" content={metadata.ogImage || 'https://vexshield.com/logo.png'} />
      <meta name="twitter:site" content={metadata.twitterSite || '@VexShield_xyz'} />

      {metadata.customMeta && Object.entries(metadata.customMeta).map(([key, value]) => (
        <meta key={key} name={key} content={value} />
      ))}

      {structuredData.map((data, index) => (
        <script key={`ld-json-${index}`} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}

      <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://zupimages.net" />
      <link rel="dns-prefetch" href="https://static.cloudflareinsights.com" />
    </Helmet>
  );
}