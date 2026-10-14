import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight  } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlatPage } from "@/data/docs";
import { useTranslation } from "react-i18next";

interface DocPagerProps {
  prev?: FlatPage;
  next?: FlatPage;
}

export function DocPager({ prev, next }: DocPagerProps) {
  const { t } = useTranslation();
  if (!prev && !next) return null;
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
      {prev ? (
        <Link
          to={`/documentation/${prev.page.id}`}
          className="group flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-primary/40 hover:bg-card"
        >
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            {t("docs.previous")}
          </span>
          <span className="font-medium text-foreground">{prev.page.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/documentation/${next.page.id}`}
          className={cn(
            "group flex flex-col items-end gap-1 rounded-xl border border-border/60 bg-card/50 p-4 text-right transition-colors hover:border-primary/40 hover:bg-card",
            !prev && "sm:col-start-2",
          )}
        >
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t("docs.next")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="font-medium text-foreground">{next.page.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
