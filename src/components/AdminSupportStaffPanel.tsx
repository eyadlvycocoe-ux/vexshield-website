import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LifeBuoy, RefreshCw, Search, User  } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-base";

interface SupportStaffRow {
  discord_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  connected_at?: string | null;
  tickets_claimed: number;
  tickets_active: number;
  panel_access_count: number;
  servers_created_month: number;
  month_key?: string;
  on_duty?: boolean;
  duty_updated_at?: string | null;
}

function formatUser(id: string, username?: string | null, display?: string | null) {
  const u = username && !/^\d{17,19}$/.test(username) ? username : null;
  const d = display && !/^\d{17,19}$/.test(display) ? display : null;
  if (d && u) return `${d} (@${u})`;
  if (u) return `@${u}`;
  if (d) return d;
  return id;
}

export function AdminSupportStaffPanel() {
  const [rows, setRows] = useState<SupportStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/support-staff"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      setRows(await res.json());
    } catch {
      toast.error("Failed to load support staff");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Support staff list refreshed");
  };

  const monthKey = rows[0]?.month_key || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.discord_id.toLowerCase().includes(q) ||
        String(r.username || "").toLowerCase().includes(q) ||
        String(r.display_name || "").toLowerCase().includes(q) ||
        String(r.email || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <Card className="bg-card/40 border-white/10 flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-orange-400" />
              Support staff
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Help Desk users with ticket claims, panel access, and monthly server quota usage
              {monthKey ? ` (${monthKey})` : ""}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Reload
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search name, email, Discord ID..."
            className="pl-10 bg-background/50 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading support staff…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 italic">
            {rows.length === 0 ? "No Help Desk staff assigned yet." : "No staff match your search."}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <Table containerClassName="overflow-x-hidden">
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-[38%]">Staff member</TableHead>
                  <TableHead className="w-[12%] text-center">Duty</TableHead>
                  <TableHead className="w-[20%]">Email</TableHead>
                  <TableHead className="w-[15%] text-center">Panel access</TableHead>
                  <TableHead className="w-[15%] text-center">Servers / mo</TableHead>
                  <TableHead className="w-[15%]">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.discord_id} className="border-white/10">
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {r.avatar_url ? (
                          <img
                            src={r.avatar_url}
                            alt=""
                            className="h-9 w-9 rounded-full border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {formatUser(r.discord_id, r.username, r.display_name)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{r.discord_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center">
                      <Badge
                        className={
                          r.on_duty
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs"
                            : "bg-slate-500/15 text-slate-400 border-slate-500/30 text-xs"
                        }
                      >
                        {r.on_duty ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className="text-sm truncate block" title={r.email || undefined}>
                        {r.email || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center">
                      <Badge variant="outline" className="text-xs border-sky-500/30 text-sky-300">
                        {r.panel_access_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          r.servers_created_month > 0
                            ? "border-orange-500/30 text-orange-300"
                            : "border-white/10 text-slate-400"
                        }`}
                      >
                        {r.servers_created_month} / 1
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {r.connected_at ? new Date(r.connected_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && filtered.length > 0 ? (
          <p className="text-xs text-slate-500">
            {filtered.length} staff member{filtered.length === 1 ? "" : "s"}
            {search.trim() ? ` matching "${search.trim()}"` : ""}.
            Assign Help Desk in Manage Users.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
