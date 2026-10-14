import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Trash2, Clock, User  } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-base";

interface RemovalLog {
  id: string;
  actor_discord_id: string;
  actor_username?: string | null;
  actor_display_name?: string | null;
  target_id: string;
  server_name?: string | null;
  owner_email?: string | null;
  owner_discord_id?: string | null;
  owner_username?: string | null;
  owner_display_name?: string | null;
  owner_avatar_url?: string | null;
  deletion_note?: string | null;
  purge_after?: string | null;
  soft_deleted_at?: string | null;
  meta_json?: string | Record<string, unknown> | null;
  created_at: string;
}

function parseMeta(raw: RemovalLog["meta_json"]) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatUser(id: string, username?: string | null, display?: string | null) {
  const u = username && !/^\d{17,19}$/.test(username) ? username : null;
  const d = display && !/^\d{17,19}$/.test(display) ? display : null;
  if (d && u) return `${d} (@${u})`;
  if (u) return `@${u}`;
  if (d) return d;
  return id;
}

function formatDt(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function UserChip({
  label,
  discordId,
  username,
  displayName,
  avatarUrl,
  email,
}: {
  label: string;
  discordId?: string | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
}) {
  const avatarSrc =
    avatarUrl ||
    (discordId ? `/api/public/discord-avatar/${discordId}?size=64` : null);

  return (
    <div className="flex items-start gap-2 min-w-0">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-8 w-8 rounded-full border border-white/10 shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-slate-500" />
        </div>
      )}
      <div className="min-w-0 text-xs">
        <p className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</p>
        <p className="text-slate-200 font-medium truncate">
          {discordId
            ? formatUser(discordId, username, displayName)
            : email || "—"}
        </p>
        {email ? <p className="text-slate-500 truncate text-[10px]">{email}</p> : null}
        {discordId ? (
          <p className="text-slate-600 font-mono text-[10px] truncate">{discordId}</p>
        ) : null}
      </div>
    </div>
  );
}

export function AdminSupportRemovalsPanel() {
  const [rows, setRows] = useState<RemovalLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/support-desk-log"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      setRows(await res.json());
    } catch {
      toast.error("Failed to load support removal log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card className="border-white/10 bg-card/40 flex flex-col flex-1 overflow-hidden">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-amber-500" />
          Support panel removals
        </CardTitle>
        <p className="text-xs text-slate-400 font-normal">
          Servers removed by support staff — reason, panel name, and 7-day retention window.
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No support removals logged yet.</p>
        ) : (
          rows.map((r) => {
            const meta = parseMeta(r.meta_json);
            const reasonText =
              (typeof r.deletion_note === "string" && r.deletion_note) ||
              (typeof meta.reason_text === "string" ? meta.reason_text : null) ||
              "—";
            return (
              <div
                key={r.id}
                className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Server className="h-4 w-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        {r.server_name || meta.server_name || r.target_id}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.target_id}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {formatDt(r.created_at)}
                  </Badge>
                </div>
                <p className="text-sm text-amber-100/90">
                  <span className="text-slate-500 text-xs uppercase tracking-wide mr-2">Reason</span>
                  {reasonText}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <UserChip
                    label="Owner"
                    discordId={r.owner_discord_id}
                    username={r.owner_username}
                    displayName={r.owner_display_name}
                    avatarUrl={r.owner_avatar_url}
                    email={r.owner_email}
                  />
                  <UserChip
                    label="Support"
                    discordId={r.actor_discord_id}
                    username={r.actor_username}
                    displayName={r.actor_display_name}
                  />
                </div>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  Purge {formatDt(r.purge_after)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
