import { Link } from "react-router-dom";
import { ChevronRight, Home, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DocBreadcrumbProps {
  categoryLabel: string;
  pageTitle: string;
}

export function DocBreadcrumb({ categoryLabel, pageTitle }: DocBreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400 font-mono">
      <Link to="/" className="flex items-center gap-1 transition-colors hover:text-cyan-300">
        <Home className="h-3 w-3 text-cyan-400" />
        <span>{t("nav.home", "Home")}</span>
      </Link>
      <ChevronRight className="h-3 w-3 opacity-40 text-cyan-500" />
      <Link to="/documentation" className="transition-colors hover:text-cyan-300">
        <span>VexShield Docs</span>
      </Link>
      <ChevronRight className="h-3 w-3 opacity-40 text-cyan-500" />
      <span className="text-zinc-500">{categoryLabel}</span>
      <ChevronRight className="h-3 w-3 opacity-40 text-cyan-500" />
      <span className="font-semibold text-cyan-300">{pageTitle}</span>
    </nav>
  );
}
