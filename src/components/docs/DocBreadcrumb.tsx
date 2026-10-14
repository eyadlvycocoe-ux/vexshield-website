import { Link } from "react-router-dom";
import { ChevronRight  } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DocBreadcrumbProps {
  categoryLabel: string;
  pageTitle: string;
}

export function DocBreadcrumb({ categoryLabel, pageTitle }: DocBreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/" className="transition-colors hover:text-foreground">
        {t("nav.home")}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      <Link to="/documentation" className="transition-colors hover:text-foreground">
        {t("docs.docs")}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      <span>{categoryLabel}</span>
      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      <span className="font-medium text-foreground">{pageTitle}</span>
    </nav>
  );
}
