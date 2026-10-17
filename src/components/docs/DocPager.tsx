import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
    <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
      {prev ? (
        <Link
          to={`/documentation/${prev.page.id}`}
          className="group flex flex-col gap-1.5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#060c1c]/90 to-[#030610]/80 p-4 transition-all duration-200 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400/80">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            {t("docs.previous", "Previous Chapter")}
          </span>
          <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
            {prev.page.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/documentation/${next.page.id}`}
          className={cn(
            "group flex flex-col items-end gap-1.5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#060c1c]/90 to-[#030610]/80 p-4 text-right transition-all duration-200 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
            !prev && "sm:col-start-2"
          )}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400/80">
            {t("docs.next", "Next Chapter")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
            {next.page.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
