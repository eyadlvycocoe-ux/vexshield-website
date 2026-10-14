import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Database, Trash2, RefreshCw, HardDriveUpload, RotateCcw  } from "lucide-react";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureCsrfCookie, getApiBaseUrl, isCsrfErrorMessage } from "@/lib/api-base";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface BackupRow {
  id: string;
  kind: "auto" | "manual";
  label: string | null;
  file_name: string;
  size_bytes: number;
  created_at: string;
  created_by_discord_id: string | null;
  file_exists?: boolean;
}

export default function AdminBackups() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualLabel, setManualLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/backups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as BackupRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    load();
  }, [staffOk, staffChecking]);

  const createManual = async () => {
    setCreating(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl("/api/admin/backups/manual"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ label: manualLabel.trim() || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Failed");
      toast.success("Manual backup created");
      setManualLabel("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed (ensure mysqldump is on PATH)");
    } finally {
      setCreating(false);
    }
  };

  const removeManual = async (id: string) => {
    if (!confirm("Delete this manual backup from disk and database?")) return;
    setBusyId(id);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/api/admin/backups/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "include",
        headers: apiMutationHeaders(),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Failed");
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (id: string) => {
    if (
      !confirm(
        "Restore this SQL dump into the current database? This replaces data from the dump and cannot be undone from the UI.",
      )
    )
      return;
    setBusyId(id);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/api/admin/backups/${encodeURIComponent(id)}/restore`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (j as { error?: string }).error || "Failed";
        if (isCsrfErrorMessage(msg)) {
          toast.error("Session security token expired - refresh the page or sign in again.");
          return;
        }
        throw new Error(msg);
      }
      toast.success("Restore completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  };

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access...
      </div>
    );
  }
  if (!staffOk) return null;

  const fmtSize = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="h-7 w-7 text-primary" />
                Database backups
              </h1>
              <p className="text-sm text-muted-foreground">
                Automatic: every 2 days, keep 2 (cannot be deleted). Manual: keep until you remove them. Backups are full database dumps (drop tables, schema, data, routines, triggers); use Restore only when you intend to replace DB contents.
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
            <CardTitle>Create manual backup</CardTitle>
            <CardDescription>Uses mysqldump on the API host (requires DB credentials in .env)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Optional label</Label>
              <Input value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} placeholder="e.g. before pricing change" />
            </div>
            <Button onClick={createManual} disabled={creating} className="gap-2">
              <HardDriveUpload className="h-4 w-4" />
              {creating ? "Running mysqldump" : "Create manual backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All backups</CardTitle>
            <CardDescription>Auto backups rotate (max 2). Restore only from here; only manual backups can be deleted.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No backups yet (first auto backup runs shortly after server start).</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {r.kind === "auto" ? "Automatic" : "Manual"}
                        {r.label ? ` - ${r.label}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {r.file_name} - {fmtSize(r.size_bytes)} - {new Date(r.created_at).toLocaleString()}
                        {!r.file_exists ? " - file missing" : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => restore(r.id)}
                        disabled={busyId === r.id || !r.file_exists}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                      {r.kind === "manual" ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => removeManual(r.id)}
                          disabled={busyId === r.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground self-center px-2">Auto - no delete</span>
                      )}
                    </div>
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

