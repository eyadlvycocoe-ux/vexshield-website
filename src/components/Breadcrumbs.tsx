import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home as HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateBreadcrumbStructuredData } from '@/lib/seo';
import { Helmet } from 'react-helmet-async';

interface BreadcrumbItem {
  name: string;
  url: string;
}

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/pricing': 'Pricing',
  '/documentation': 'Documentation',
  '/help-center': 'Help Center',
  '/faqs': 'FAQs',
  '/terms': 'Terms',
  '/privacy': 'Privacy',
  '/refund': 'Refund',
  '/partners': 'Partners',
  '/download': 'Download',
  '/models': 'AI Models',
  '/library': 'Config Library',
  '/search': 'Search',
  '/airshield': 'VexShield',
  '/airshield/features': 'Features',
  '/airshield/pricing': 'Pricing',
  '/airshield/docs': 'Documentation',
  '/airshield/faq': 'FAQ',
  '/airshield/security': 'Security',
  '/airshield/changelog': 'Changelog',
  '/about': 'About',
  '/contact': 'Contact',
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const segments = cleanPath.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ name: 'Home', url: '/' }];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ name: label, url: currentPath });
  }

  return breadcrumbs;
}

export function Breadcrumbs() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const structuredData = generateBreadcrumbStructuredData(breadcrumbs);

  if (breadcrumbs.length <= 1) {
    return (
      <>
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        </Helmet>
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link to="/" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
                <HomeIcon className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </li>
          </ol>
        </nav>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <li key={item.url} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-white font-medium" aria-current="page">{item.name}</span>
              ) : (
                <Link
                  to={item.url}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  {index === 0 && <HomeIcon className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}