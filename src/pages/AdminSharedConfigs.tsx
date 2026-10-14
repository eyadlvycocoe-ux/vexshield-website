import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, RefreshCw, Search, Trash2, Download } from "lucide-react";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface SharedConfigRow {
  id: string;
  code: string;
  server_name: string;
  server_type: "pvp" | "rp";
  created_at: string;
  created_by?: string | null;
  avg_rating: number;
  ratings_count: number;
  load_count?: number;
}

export default function AdminSharedConfigs() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [configs, setConfigs] = useState<SharedConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    void loadConfigs();
  }, [staffOk, staffChecking]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("shared_configs")
        .select("id, code, server_name, server_type, created_at, created_by, avg_rating, ratings_count, load_count")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setConfigs((data || []) as SharedConfigRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load config library");
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadConfigs();
    setRefreshing(false);
    toast.success("Config library refreshed");
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter(
      (c) =>
        c.server_name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.created_by || "").toLowerCase().includes(q),
    );
  }, [configs, searchTerm]);

  const totalLoads = useMemo(
    () => configs.reduce((sum, c) => sum + (Number(c.load_count) || 0), 0),
    [configs],
  );

  const handleDelete = async (row: SharedConfigRow) => {
    if (
      !confirm(
        `Remove "${row.server_name}" (${row.code}) from the public config library? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(row.id);
    try {
      const { error } = await (supabase as any).from("shared_configs").delete().eq("id", row.id);
      if (error) throw error;
      setConfigs((prev) => prev.filter((c) => c.id !== row.id));
      toast.success(`Removed ${row.code}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete config");
    } finally {
      setDeletingId(null);
    }
  };

  if (staffChecking) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verifying access...</div>;
  }

  if (!staffOk) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <BookOpen className="h-6 w-6 text-sky-400" />
                Config Library
              </h1>
              <p className="text-sm text-muted-foreground">Remove community-shared anti-cheat configs</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Published</p>
            <p className="mt-1 text-2xl font-bold">{configs.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total loads</p>
            <p className="mt-1 text-2xl font-bold text-sky-400">{totalLoads}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Showing</p>
            <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border/50 p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, code, or server ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Loads</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No configs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[180px] truncate font-medium">{row.server_name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {row.server_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.avg_rating > 0 ? row.avg_rating.toFixed(1) : "-"} ({row.ratings_count || 0})
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-400">
                          <Download className="h-3.5 w-3.5" />
                          {Number(row.load_count) || 0}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                        {row.created_by || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
