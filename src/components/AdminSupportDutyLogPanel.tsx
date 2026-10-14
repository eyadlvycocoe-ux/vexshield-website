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
import { Clock, RefreshCw, Search, User, ToggleLeft  } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-base";

interface DutyLogRow {
  id: string;
  support_user_id: string;
  on_duty: boolean;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
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

export function AdminSupportDutyLogPanel() {
  const [rows, setRows] = useState<DutyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/support-duty-log?limit=300"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load");
      setRows(await res.json());
    } catch {
      toast.error("Failed to load duty logs");
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
    toast.success("Duty logs refreshed");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const action = r.on_duty ? "on" : "off";
      return (
        r.support_user_id.toLowerCase().includes(q) ||
        String(r.username || "").toLowerCase().includes(q) ||
        String(r.display_name || "").toLowerCase().includes(q) ||
        String(r.email || "").toLowerCase().includes(q) ||
        action.includes(q)
      );
    });
  }, [rows, search]);

  return (
    <Card className="bg-card/40 border-white/10 flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ToggleLeft className="h-5 w-5 text-emerald-400" />
              Duty logs
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              When Help Desk staff turn duty on or off in the Support Panel.
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
            placeholder="Search staff, on, off..."
            className="pl-10 bg-background/50 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading duty logs…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 italic">No duty activity recorded yet.</div>
        ) : (
          <div className="rounded-lg border border-white/10 overflow-hidden max-h-[calc(100vh-280px)] overflow-y-auto">
            <Table containerClassName="overflow-x-hidden">
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-[38%]">Staff</TableHead>
                  <TableHead className="w-[14%]">Action</TableHead>
                  <TableHead className="w-[28%]">Email</TableHead>
                  <TableHead className="w-[20%]">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-white/10">
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {r.avatar_url ? (
                          <img
                            src={r.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {formatUser(r.support_user_id, r.username, r.display_name)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {r.support_user_id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge
                        className={
                          r.on_duty
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                        }
                      >
                        {r.on_duty ? "On duty" : "Off duty"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-400 truncate">
                      {r.email || "—"}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      <Clock className="inline h-3 w-3 mr-1 opacity-60" />
                      {formatDt(r.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
