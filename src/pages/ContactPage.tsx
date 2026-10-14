import { Link } from "react-router-dom";
import { Mail, MessageCircle, Globe, MapPin, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SEOHelmet } from "@/components/SEOHelmet";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const contactMethods = [
    {
      icon: MessageCircle,
      title: "Discord Community",
      description: "Primary support channel. Get help with installation, configuration, billing, and technical issues.",
      action: "Join Discord",
      href: "https://discord.gg/5WgtMWbtgD",
      external: true,
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "For account issues, partnership inquiries, and formal correspondence. Response within 24-48 hours.",
      action: "Email Us",
      href: "mailto:support@vexshield.com",
      external: false,
    },
    {
      icon: Globe,
      title: "Documentation",
      description: "Self-service guides for installation, configuration, commands, and troubleshooting all products.",
      action: "Read Docs",
      href: "/documentation",
      external: false,
    },
    {
      icon: MapPin,
      title: "Company Location",
      description: "VexShield is dedicated to next-generation FiveM anticheat security.",
      action: "View Location",
      href: "#",
      external: false,
    },
  ];

  const legalLinks = [
    { title: "Terms of Service", href: "/terms" },
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Refund Policy", href: "/refund" },
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
                Contact VexShield
              </h1>
              <p className="max-w-2xl mx-auto text-lg leading-relaxed text-zinc-300 mb-8">
                Get in touch for support, partnerships, or general inquiries. We're here to help secure your FiveM server.
              </p>
            </section>

            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white mb-4">
                  Contact Methods
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">Choose the best way to reach us based on your needs.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {contactMethods.map((method, index) => (
                  <Card key={method.title} className={cn("group flex flex-col h-full rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e1626]/60 to-[#070b14]/90 p-6 shadow-xl transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1 text-center")} style={{ animationDelay: `${index * 0.08}s` }}>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto">
                      <method.icon className="h-6 w-6" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold text-white">{method.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm leading-relaxed text-zinc-400 mb-4">{method.description}</p>
                      <Button asChild variant="outline" className="w-full">
                        <a href={method.href} target={method.external ? "_blank" : undefined} rel={method.external ? "noopener noreferrer" : undefined} className="flex items-center justify-center gap-2">
                          {method.action}
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white mb-4">
                  Quick Links
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3 max-w-xl mx-auto">
                {legalLinks.map((link, index) => (
                  <Card key={link.title} className={cn("group rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-blue-500/30 transition-colors")} style={{ animationDelay: `${index * 0.08}s` }}>
                    <CardContent className="pt-6 pb-6">
                      <Link to={link.href} className="flex items-center justify-center gap-2 p-4 rounded-xl hover:bg-white/[0.02] transition-colors">
                        <Shield className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-white">{link.title}</span>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="text-center">
              <Card className="border-blue-500/30 bg-blue-500/5 max-w-2xl mx-auto">
                <CardContent className="pt-8 pb-8 px-6">
                  <h3 className="text-2xl font-bold text-white mb-3">Need immediate help?</h3>
                  <p className="text-zinc-300 mb-6">Join our Discord for real-time support from the VexShield team and community.</p>
                  <Button asChild className="h-12 rounded-xl bg-[#0f3b7a] hover:bg-[#154ca0] px-8 text-sm font-black uppercase tracking-wider shadow-xl shadow-blue-950/60">
                    <a href="https://discord.gg/5WgtMWbtgD" target="_blank" rel="noopener noreferrer">Join Discord Support</a>
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