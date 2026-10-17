import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Clock, Home, Menu, Search, Shield, Cpu, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
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

  // Global Ctrl/Cmd+K to open search
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

  // Scroll to top on page change, or to the hashed section
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
    <div className="relative min-h-screen bg-[#030611] text-zinc-100 selection:bg-cyan-500/30 selection:text-white">
      {/* Background cyber radial glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(6,182,212,0.12),rgba(0,0,0,0))]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.06),rgba(0,0,0,0))]" />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-cyan-500/15 bg-[#040815]/85 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 border-cyan-500/30 bg-cyan-950/20 text-cyan-300">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[310px] border-cyan-500/20 bg-[#050916] p-4 text-white">
            <Link to="/" className="mb-4 flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-white block text-sm">VexShield</span>
                <span className="text-[10px] font-mono text-cyan-400 block">FiveM Documentation</span>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="w-full mb-3 rounded-xl border-cyan-500/25 bg-cyan-950/30 hover:bg-cyan-900/40 text-xs font-semibold text-cyan-200 hover:text-white"
            >
              <Home className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
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
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate font-bold text-sm text-white">{page.title}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => navigate("/")}
            title={t("nav.home", "Home")}
          >
            <Home className="h-4 w-4 text-cyan-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-cyan-400 hover:text-white hover:bg-cyan-500/10"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative mx-auto flex max-w-[1550px] gap-8 px-4 md:px-6">
        {/* Left Sticky Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col py-6 lg:flex xl:w-72">
          {/* Header Brand */}
          <div className="mb-5 flex items-center justify-between pb-2 border-b border-cyan-500/10">
            <Link to="/" className="flex items-center gap-2.5 group transition-all">
              <div className="rounded-xl border border-cyan-500/35 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 transition-colors">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  VexShield
                </p>
                <p className="text-[10px] font-mono font-medium text-cyan-400/80">Documentation</p>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="h-7 rounded-lg border-white/10 bg-white/[0.03] hover:bg-cyan-950/30 hover:border-cyan-500/40 text-[11px] text-zinc-300 hover:text-cyan-200 transition-all font-mono"
            >
              <Home className="h-3 w-3 mr-1 text-cyan-400" />
              Home
            </Button>
          </div>

          {/* Sidebar Nav */}
          <div className="min-h-0 flex-1">
            <DocSidebar
              activePageId={page.id}
              onOpenSearch={() => setSearchOpen(true)}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 py-6 lg:py-8">
          <div className="mx-auto max-w-3xl space-y-8">
            {/* Page Header */}
            <div className="space-y-4 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#060e22]/80 via-[#040816]/70 to-[#02050e]/90 p-6 md:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.08)]">
              <DocBreadcrumb categoryLabel={category.label} pageTitle={page.title} />

              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
                    {page.title}
                  </h1>
                  {page.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-0.5 text-xs font-mono font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      {page.badge}
                    </span>
                  )}
                </div>

                <p className="text-sm md:text-base leading-relaxed text-zinc-300">
                  {page.description}
                </p>

                {/* Metadata Chips */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.06] text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                    <Clock className="h-3.5 w-3.5 text-cyan-400/80" />
                    <span>{t("docs.lastModified", { date: formatDate(page.lastModified) })}</span>
                  </div>

                  <span className="text-zinc-600">•</span>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300/80">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                    <span>FiveM Standalone / ESX / QBCore</span>
                  </div>

                  <span className="text-zinc-600 hidden sm:inline">•</span>

                  <Link
                    to="/my-servers"
                    className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-zinc-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>Dashboard</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Page Sections */}
            <div className="space-y-12">
              {page.sections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <section
                    key={section.id}
                    id={`section-${section.id}`}
                    className="scroll-mt-24 space-y-4"
                  >
                    <div className="group flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                      <h2 className="flex items-center gap-2.5 text-lg md:text-xl font-bold text-white tracking-tight">
                        {SectionIcon ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            <SectionIcon className="h-4 w-4" />
                          </div>
                        ) : (
                          <span className="text-cyan-400 font-mono text-base">#</span>
                        )}
                        <a
                          href={`#section-${section.id}`}
                          className="hover:text-cyan-300 transition-colors"
                        >
                          {section.title}
                        </a>
                      </h2>
                    </div>

                    <div className="space-y-4 pt-1">
                      {section.blocks.map((block, i) => (
                        <DocBlockView key={i} block={block} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Pagination footer */}
            <div className="pt-6 border-t border-cyan-500/15">
              <DocPager prev={prev} next={next} />
            </div>
          </div>
        </main>

        {/* Right Sticky Table of Contents */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 overflow-y-auto py-8 xl:block">
          <DocToc sections={page.sections} />
        </aside>
      </div>

      <DocSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
