import { Link } from "react-router-dom";
import { Shield, Users, Cpu, Lock, Globe, Heart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SEOHelmet } from "@/components/SEOHelmet";
import { cn } from "@/lib/utils";

export default function AboutPage() {
  const team = [
    { name: "VexShield Team", role: "Development Team", location: "Global / Morocco" },
  ];

  const values = [
    { icon: Shield, title: "Security First", description: "Every feature is designed with security as the primary concern. No compromises on protection quality." },
    { icon: Users, title: "Community Driven", description: "Built based on real server owner needs. Direct feedback loop through Discord and support channels." },
    { icon: Cpu, title: "Performance Focused", description: "Zero FPS impact architecture. Heuristic detection runs efficiently without server lag." },
    { icon: Lock, title: "No False Promises", description: "Factual marketing only. We don't claim 100% detection rates or use misleading terminology." },
    { icon: Globe, title: "Global Infrastructure", description: "Owned network infrastructure in Frankfurt (DE) and US locations for low latency worldwide." },
    { icon: Heart, title: "Moroccan Engineering", description: "Proudly developed by a Moroccan team. All core architecture originates from Morocco." },
  ];

  const products = [
    { name: "VexShield Anticheat", description: "Core FiveM anti-cheat with real-time detection, automated bans, in-game admin menu, and web dashboard.", href: "/pricing" },
  ];

  return (
    <>
      <SEOHelmet />
      <div className="min-h-screen bg-[#0F1017] text-white">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_50%)] pointer-events-none" />

        <div className="relative z-10">
          <header className="container mx-auto px-4 py-6 flex justify-between items-center backdrop-blur-sm gap-3 border-b border-white/10">
            <Link to="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
              <img src="/logo.png" alt="VexShield Logo" className="h-10 w-auto object-contain" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VexShield
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Button onClick={() => window.open("https://discord.gg/5WgtMWbtgD", "_blank")} variant="outline" className="rounded-xl">
                Discord
              </Button>
            </div>
          </header>

          <main className="container mx-auto px-4 py-12">
            <Breadcrumbs />

            <section className="mb-16 text-center max-w-4xl mx-auto">
              <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[1.05] tracking-tight text-white mb-6">
                About VexShield
              </h1>
              <p className="max-w-2xl mx-auto text-lg leading-relaxed text-zinc-300 mb-8">
                VexShield is a premier FiveM anti-cheat solution developed to safeguard servers against all forms of modern exploits.
                We provide real-time protection, automated bans, heuristic detection, and comprehensive server management tools.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
                </span>
                MOROCCAN DEVELOPMENT TEAM
              </div>
            </section>

            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white mb-4">
                  Our Values
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">Principles that guide every product decision and line of code.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {values.map((value, index) => (
                  <Card key={value.title} className={cn("group flex flex-col h-full rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e1626]/60 to-[#070b14]/90 p-6 shadow-xl transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1")} style={{ animationDelay: `${index * 0.08}s` }}>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400"><value.icon className="h-6 w-6" /></div>
                    <CardHeader className="pb-2"><CardTitle className="text-lg font-bold text-white">{value.title}</CardTitle></CardHeader>
                    <CardContent className="flex-1"><p className="text-sm leading-relaxed text-zinc-400">{value.description}</p></CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white mb-4">
                  Our Product
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">Advanced anticheat ecosystem built specifically for FiveM servers.</p>
              </div>
              <div className="max-w-xl mx-auto">
                {products.map((product, index) => (
                  <Card key={product.name} className={cn("group flex flex-col h-full rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e1626]/60 to-[#070b14]/90 p-6 shadow-xl transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1")} style={{ animationDelay: `${index * 0.08}s` }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold text-white">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm leading-relaxed text-zinc-400 mb-4">{product.description}</p>
                      <Button asChild variant="outline" className="w-full">
                        <Link to={product.href} className="flex items-center justify-center gap-2">
                          View Pricing
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white mb-4">
                  Team
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                {team.map((member, index) => (
                  <Card key={member.name} className={cn("group flex flex-col h-full rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e1626]/60 to-[#070b14]/90 p-6 shadow-xl transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1 text-center")} style={{ animationDelay: `${index * 0.08}s` }}>
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto">
                      <Shield className="h-10 w-10" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold text-white">{member.name}</CardTitle>
                      <p className="text-sm text-zinc-400">{member.role}</p>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm leading-relaxed text-zinc-400">{member.location}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="text-center">
              <Card className="border-blue-500/30 bg-blue-500/5 max-w-2xl mx-auto">
                <CardContent className="pt-8 pb-8 px-6">
                  <h3 className="text-2xl font-bold text-white mb-3">Join our community</h3>
                  <p className="text-zinc-300 mb-6">Get support, share feedback, and stay updated on the latest security features.</p>
                  <Button asChild className="h-12 rounded-xl bg-[#0f3b7a] hover:bg-[#154ca0] px-8 text-sm font-black uppercase tracking-wider shadow-xl shadow-blue-950/60">
                    <Link to="https://discord.gg/5WgtMWbtgD" target="_blank" rel="noopener noreferrer">Join Discord</Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </main>

          <footer className="container mx-auto px-4 py-8 text-center text-zinc-500 border-t border-white/10">
            <div className="flex flex-col items-center gap-4">
              <p>&copy; 2026 VexShield. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                <a href="/refund" className="hover:text-white transition-colors">Refund Policy</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}