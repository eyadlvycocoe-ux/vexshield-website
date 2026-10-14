import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Send, Users  } from "lucide-react";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureMutationCsrf } from "@/lib/api-base";
import { useTranslation } from "react-i18next";

const BRAND_IMAGE = "/logo.png";

interface Partner {
  id: string;
  logo_url: string;
  partner_name: string;
  discord_url?: string | null;
  display_order: number;
}

const SERVER_TYPES = [
  { value: "rp", label: "Roleplay (RP)" },
  { value: "pvp", label: "PVP" },
  { value: "rp_pvp", label: "RP + PVP" },
  { value: "freeroam", label: "Freeroam" },
  { value: "other", label: "Other" },
];

export default function Partners() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    server_name: "",
    server_type: "rp",
    peak_players: "",
    discord_link: "",
    logo_url: "",
  });

  useEffect(() => {
    void loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/partners"));
      if (res.ok) setPartners(await res.json());
    } catch {
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to apply");
      navigate("/auth");
      return;
    }

    const peak = parseInt(form.peak_players, 10);
    if (!form.server_name.trim()) {
      toast.error("Server name is required");
      return;
    }
    if (!Number.isFinite(peak) || peak < 1) {
      toast.error("Enter a valid peak player count");
      return;
    }
    if (!form.discord_link.trim()) {
      toast.error("Discord link is required");
      return;
    }

    setSubmitting(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl("/partner-applications"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          server_name: form.server_name.trim(),
          server_type: form.server_type,
          peak_players: peak,
          discord_link: form.discord_link.trim(),
          logo_url: form.logo_url.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Submit failed");
      toast.success("Application submitted! We will review it soon.");
      setForm({ server_name: "", server_type: "rp", peak_players: "", discord_link: "", logo_url: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,149,255,0.08)_0%,_transparent_50%)]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" />

      <header className="relative z-10 border-b border-white/10 bg-[#030712]/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
          >
            <img src={BRAND_IMAGE} alt={t("common.brand")} className="h-9 w-auto rounded-lg object-contain" />
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("partners.title")}</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">{t("partners.subtitle")}</p>
        </div>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-6">{t("partners.ourPartners")}</h2>
          {loading ? (
            <p className="text-slate-400 text-center py-8">{t("partners.loading")}</p>
          ) : partners.length === 0 ? (
            <Card className="border-white/10 bg-card/30">
              <CardContent className="py-10 text-center text-slate-400">
                {t("partners.noPartners")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((p) => (
                <Card key={p.id} className="border-white/10 bg-card/40 backdrop-blur hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <img
                      src={p.logo_url}
                      alt={p.partner_name}
                      className="h-16 w-16 rounded-xl object-contain bg-white/5 p-1"
                    />
                    <p className="font-semibold text-lg">{p.partner_name}</p>
                    {p.discord_url ? (
                      <a
                        href={p.discord_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        Discord
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>{t("partners.applyTitle")}</CardTitle>
              <CardDescription>{t("partners.applyDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-xl">
                <div>
                  <Label htmlFor="server_name">{t("partners.serverName")} *</Label>
                  <Input
                    id="server_name"
                    value={form.server_name}
                    onChange={(e) => setForm({ ...form, server_name: e.target.value })}
                    placeholder="My FiveM Server"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="server_type">{t("partners.serverType")} *</Label>
                  <Select
                    value={form.server_type}
                    onValueChange={(v) => setForm({ ...form, server_type: v })}
                  >
                    <SelectTrigger id="server_type" className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVER_TYPES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="peak_players">{t("partners.peakPlayers")} *</Label>
                  <Input
                    id="peak_players"
                    type="number"
                    min={1}
                    value={form.peak_players}
                    onChange={(e) => setForm({ ...form, peak_players: e.target.value })}
                    placeholder="e.g. 128"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="discord_link">{t("partners.discordLink")} *</Label>
                  <Input
                    id="discord_link"
                    value={form.discord_link}
                    onChange={(e) => setForm({ ...form, discord_link: e.target.value })}
                    placeholder="https://discord.gg/yourserver"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="logo_url">{t("partners.logoUrl")}</Label>
                  <Input
                    id="logo_url"
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png (optional)"
                    className="bg-background/50"
                  />
                </div>
                {!user ? (
                  <p className="text-sm text-amber-400/90">{t("partners.signInRequired")}</p>
                ) : null}
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? t("partners.submitting") : t("partners.submit")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
