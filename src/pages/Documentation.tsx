import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Clock, Home, Menu, Search, Shield  } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PAGE_ID,
  getAdjacentPages,
  getPage,
} from "@/data/docs";
import { DocSidebar } from "@/components/docs/DocSidebar";
import { DocToc } from "@/components/docs/DocToc";
import { DocSearch } from "@/components/docs/DocSearch";
import { DocBreadcrumb } from "@/components/docs/DocBreadcrumb";
import { DocPager } from "@/components/docs/DocPager";
import { DocBlockView } from "@/components/docs/DocBlocks";
import { useTranslation } from "react-i18next";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMMM d, yyyy");
  } catch {
    return iso;
  }
}

export default function Documentation() {
  const { t } = useTranslation();
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const entry = getPage(pageId);

  // Global Ctrl/Cmd+K to open search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Scroll to top on page change, or to the hashed section when present.
  useEffect(() => {
    if (!entry) return;
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        window.requestAnimationFrame(() => {
          const top = el.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top, behavior: "smooth" });
        });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [entry, location.hash, pageId]);

  if (!pageId) return <Navigate to={`/documentation/${DEFAULT_PAGE_ID}`} replace />;
  if (!entry) return <Navigate to={`/documentation/${DEFAULT_PAGE_ID}`} replace />;

  const { page, category } = entry;
  const { prev, next } = getAdjacentPages(page.id);

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] border-border/60 bg-card p-4">
            <Link to="/" className="mb-4 flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="rounded-lg border border-primary/25 bg-primary/15 p-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">{t("docs.brand")}</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="w-full mb-3 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-zinc-300 hover:text-white"
            >
              <Home className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
              Back to Home
            </Button>
            <DocSidebar
              activePageId={page.id}
              onNavigate={() => setMobileNavOpen(false)}
              onOpenSearch={() => {
                setMobileNavOpen(false);
                setSearchOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>
        <span className="truncate font-semibold text-sm">{page.title}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-400 hover:text-white"
            onClick={() => navigate("/")}
            title={t("nav.home", "Home")}
          >
            <Home className="h-4 w-4 text-sky-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1500px] gap-8 px-4 md:px-6">
        {/* Left sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col py-6 lg:flex xl:w-72">
          <div className="mb-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
              <div className="rounded-lg border border-primary/25 bg-primary/15 p-2 group-hover:border-primary/50 transition-colors">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">VexShield</p>
                <p className="text-xs text-muted-foreground">{t("docs.documentation")}</p>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="h-8 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white"
            >
              <Home className="h-3.5 w-3.5 mr-1 text-sky-400" />
              Home
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <DocSidebar
              activePageId={page.id}
              onOpenSearch={() => setSearchOpen(true)}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 py-6 lg:py-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="space-y-4">
              <DocBreadcrumb categoryLabel={category.label} pageTitle={page.title} />
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {page.title}
                  </h1>
                  {page.badge && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {page.badge}
                    </span>
                  )}
                </div>
                <p className="text-base text-muted-foreground md:text-lg">{page.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t("docs.lastModified", { date: formatDate(page.lastModified) })}
                </div>
              </div>
            </div>

            <div className="space-y-12">
              {page.sections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <section
                    key={section.id}
                    id={`section-${section.id}`}
                    className="scroll-mt-24 space-y-4"
                  >
                    <h2 className="group flex items-center gap-2 border-b border-border/40 pb-2 text-xl font-semibold text-foreground md:text-2xl">
                      {SectionIcon && <SectionIcon className="h-5 w-5 text-primary" />}
                      <a href={`#section-${section.id}`} className="hover:text-primary">
                        {section.title}
                      </a>
                    </h2>
                    <div className="space-y-4">
                      {section.blocks.map((block, i) => (
                        <DocBlockView key={i} block={block} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <DocPager prev={prev} next={next} />
          </div>
        </main>

        {/* Right table of contents */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 overflow-y-auto py-8 xl:block">
          <DocToc sections={page.sections} />
          <div className="mt-6 border-t border-border/60 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/")}
            >
              <Home className="mr-2 h-4 w-4" />
              Back to site
            </Button>
          </div>
        </aside>
      </div>

      <DocSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
