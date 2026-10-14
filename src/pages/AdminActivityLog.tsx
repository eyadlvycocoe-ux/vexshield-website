import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ScrollText, RefreshCw  } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface ActivityRow {
  id: string;
  actor_discord_id: string;
  actor_username?: string | null;
  actor_email?: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminActivityLog() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/activity-log?limit=200`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as ActivityRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    load();
  }, [staffOk, staffChecking]);

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access...
      </div>
    );
  }
  if (!staffOk) return null;

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ScrollText className="h-7 w-7 text-primary" />
                Activity log
              </h1>
              <p className="text-sm text-muted-foreground">
                Staff actions (read-only). Shows name and email from linked Discord accounts when available.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border/60 bg-card/50 p-3 font-mono text-xs sm:text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                      <span className="text-foreground font-medium">{r.action_type}</span>
                      <span></span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {r.actor_username || r.actor_discord_id}
                      </span>
                      {r.actor_email ? (
                        <span className="text-foreground/80"> - {r.actor_email}</span>
                      ) : r.actor_discord_id !== "system" ? (
                        <span className="text-xs"> (id: {r.actor_discord_id})</span>
                      ) : null}
                      {r.target_type ? (
                        <>
                          {" "}
                          ? {r.target_type}
                          {r.target_id ? `: ${r.target_id}` : ""}
                        </>
                      ) : null}
                    </div>
                    {r.meta_json && Object.keys(r.meta_json).length > 0 ? (
                      <pre className="mt-2 max-h-24 overflow-auto rounded bg-muted/40 p-2 text-[11px] leading-snug">
                        {JSON.stringify(r.meta_json, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

