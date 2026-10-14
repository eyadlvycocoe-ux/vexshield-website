import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  LifeBuoy,
  MessageCircle,
  Home,
  Mail,
  ArrowRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Sparkles,
} from "lucide-react";

const CONTACT_EMAIL = "support@vexshield.com";

export default function Support() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030712] relative text-slate-100 font-['Inter',sans-serif] overflow-hidden">
      {/* Dynamic Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[180px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[180px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[160px]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />

      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="VexShield" className="h-9 w-auto" />
            <span className="text-xl font-extrabold tracking-tight text-white">VexShield</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-500/30 text-slate-200 hover:text-white transition-all text-xs font-semibold gap-1.5 h-10 px-4"
          >
            <Home className="h-3.5 w-3.5 text-cyan-400" />
            Back to Home
          </Button>
        </div>

        {/* Hero Banner */}
        <header className="mb-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <LifeBuoy className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
              VEXSHIELD ASSISTANCE HUB
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            {t("support.title") || "How can we help you?"}
          </h1>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            {t("support.subtitle") ||
              "Find answers, consult technical documentation, or speak with our engineers directly."}
          </p>
        </header>

        {/* Support Channels Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Discord Card */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#081322]/80 hover:bg-[#0c182b] hover:border-[#5865F2]/50 backdrop-blur-xl p-6 transition-all duration-300 shadow-xl hover:shadow-[#5865F2]/15 flex flex-col justify-between hover:-translate-y-1">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] group-hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-[#5865F2] transition-colors">
                Discord Community
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Join our 24/7 technical guild for live ticket assistance, setup guidance, and announcements.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild className="w-full h-11 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shadow-lg shadow-[#5865F2]/25 gap-2">
                <a href="https://discord.gg/5WgtMWbtgD" target="_blank" rel="noreferrer">
                  <span>Open Discord</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>
              </Button>
            </div>
          </div>

          {/* Email Support Card */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#081322]/80 hover:bg-[#0c182b] hover:border-cyan-500/50 backdrop-blur-xl p-6 transition-all duration-300 shadow-xl hover:shadow-cyan-500/15 flex flex-col justify-between hover:-translate-y-1">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                Direct Email Desk
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Formal business inquiries, billing escalation, and enterprise licensing support.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild variant="outline" className="w-full h-11 rounded-xl border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs gap-2">
                <a href={`mailto:${CONTACT_EMAIL}`}>
                  <span>{CONTACT_EMAIL}</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Documentation Card */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#081322]/80 hover:bg-[#0c182b] hover:border-blue-500/50 backdrop-blur-xl p-6 transition-all duration-300 shadow-xl hover:shadow-blue-500/15 flex flex-col justify-between hover:-translate-y-1">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                Documentation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step-by-step FiveM installation guides, manifest injection docs, and convar references.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild variant="outline" className="w-full h-11 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-xs gap-2">
                <Link to="/documentation">
                  <span>Explore Docs</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                </Link>
              </Button>
            </div>
          </div>

          {/* FAQs Card */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#081322]/80 hover:bg-[#0c182b] hover:border-emerald-500/50 backdrop-blur-xl p-6 transition-all duration-300 shadow-xl hover:shadow-emerald-500/15 flex flex-col justify-between hover:-translate-y-1">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Knowledge Base & FAQs
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant answers to the most frequent questions regarding licensing, renewals, and false positives.
              </p>
            </div>
            <div className="pt-6">
              <Button asChild variant="outline" className="w-full h-11 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-xs gap-2">
                <Link to="/faqs">
                  <span>Read FAQs</span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
