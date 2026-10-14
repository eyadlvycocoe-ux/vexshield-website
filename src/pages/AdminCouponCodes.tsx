import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Pencil, Plus, RefreshCw, Search, Trash2, Percent  } from "lucide-react";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface CouponCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  target_product: string | null;
  target_duration: string | null;
  new_users_only: boolean | number;
  min_purchase: number;
  uses_remaining: number | null;
  expires_at: string | null;
  is_active: boolean | number;
  created_at: string;
}

const PRODUCTS = [
  { key: "", label: "Any product" },
  { key: "airshield", label: "VexShield" },
];

const DURATIONS = [
  { key: "", label: "Any duration" },
  { key: "1month", label: "1 month" },
  { key: "3month", label: "3 months" },
  { key: "permanent", label: "Lifetime" },
];

export default function AdminCouponCodes() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [codes, setCodes] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CouponCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: "",
    targetProduct: "",
    targetDuration: "",
    newUsersOnly: false,
    minPurchase: "0",
    uses: "",
    expiresAt: "",
    isActive: true,
  });

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    void loadCodes();
  }, [staffOk, staffChecking]);

  const loadCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("coupon_codes").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load coupon codes");
    else setCodes((data || []) as CouponCode[]);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadCodes();
    setRefreshing(false);
    toast.success("Coupon codes refreshed");
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return codes.filter((c) => c.code.toLowerCase().includes(q));
  }, [codes, searchTerm]);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `SAVE-${seg()}-${seg()}`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: generateCode(),
      discountType: "percent",
      discountValue: "10",
      targetProduct: "",
      targetDuration: "",
      newUsersOnly: false,
      minPurchase: "0",
      uses: "100",
      expiresAt: "",
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (c: CouponCode) => {
    setEditing(c);
    setForm({
      code: c.code,
      discountType: c.discount_type,
      discountValue: String(c.discount_value),
      targetProduct: c.target_product || "",
      targetDuration: c.target_duration || "",
      newUsersOnly: !!c.new_users_only,
      minPurchase: String(c.min_purchase ?? 0),
      uses: c.uses_remaining != null ? String(c.uses_remaining) : "",
      expiresAt: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      isActive: c.is_active !== false && c.is_active !== 0,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const value = Number(form.discountValue);
    const minPurchase = Number(form.minPurchase);
    const uses = form.uses.trim() ? Number(form.uses) : null;
    if (!form.code.trim()) {
      toast.error("Code is required");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid discount value");
      return;
    }
    if (form.discountType === "percent" && value > 100) {
      toast.error("Percent discount cannot exceed 100");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discountType,
        discount_value: value,
        target_product: form.targetProduct || null,
        target_duration: form.targetDuration || null,
        new_users_only: form.newUsersOnly ? 1 : 0,
        min_purchase: Number.isFinite(minPurchase) ? minPurchase : 0,
        uses_remaining: uses,
        expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        is_active: form.isActive ? 1 : 0,
      };
      if (editing) {
        const { error } = await supabase.from("coupon_codes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Coupon updated");
      } else {
        const { error } = await supabase.from("coupon_codes").insert(payload);
        if (error) throw error;
        toast.success("Coupon created");
      }
      setModalOpen(false);
      await loadCodes();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CouponCode) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const { error } = await supabase.from("coupon_codes").delete().eq("id", c.id);
    if (error) toast.error("Failed to delete");
    else {
      setCodes((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Coupon deleted");
    }
  };

  const formatDiscount = (c: CouponCode) =>
    c.discount_type === "percent" ? `${c.discount_value}% off` : `€${Number(c.discount_value).toFixed(2)} off`;

  const statusBadge = (c: CouponCode) => {
    if (!c.is_active || c.is_active === 0) return <Badge variant="secondary">Inactive</Badge>;
    if (c.expires_at && new Date(c.expires_at) < new Date()) return <Badge variant="destructive">Expired</Badge>;
    if (c.uses_remaining != null && c.uses_remaining <= 0) return <Badge variant="secondary">Used up</Badge>;
    return <Badge variant="outline">Active</Badge>;
  };

  if (staffChecking) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verifying access…</div>;
  }
  if (!staffOk) return null;

  return (
    <div className="relative min-h-screen p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold">
                <Percent className="h-8 w-8 text-primary" />
                Coupon Codes
              </h1>
              <p className="text-muted-foreground">Checkout discount codes — percent, plan, or new-user only</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New coupon
            </Button>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 p-4 backdrop-blur-xl">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search codes…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Restrictions</TableHead>
                <TableHead>Uses left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No coupon codes</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{formatDiscount(c)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[c.target_product, c.target_duration].filter(Boolean).join(" · ") || "All plans"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.new_users_only ? "New users only" : "Everyone"}
                      {Number(c.min_purchase) > 0 ? ` · min €${Number(c.min_purchase).toFixed(2)}` : ""}
                    </TableCell>
                    <TableCell>{c.uses_remaining ?? "∞"}</TableCell>
                    <TableCell>{statusBadge(c)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => void remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "Create coupon"}</DialogTitle>
            <DialogDescription>Applied at checkout after wallet balance</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm((f) => ({ ...f, discountType: v as "percent" | "fixed" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Product (optional)</Label>
                <Select value={form.targetProduct || "any"} onValueChange={(v) => setForm((f) => ({ ...f, targetProduct: v === "any" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((p) => (
                      <SelectItem key={p.key || "any"} value={p.key || "any"}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan duration (optional)</Label>
                <Select value={form.targetDuration || "any"} onValueChange={(v) => setForm((f) => ({ ...f, targetDuration: v === "any" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.key || "any"} value={d.key || "any"}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Uses remaining (empty = unlimited)</Label>
                <Input value={form.uses} onChange={(e) => setForm((f) => ({ ...f, uses: e.target.value }))} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label>Min purchase (€)</Label>
                <Input type="number" min="0" step="0.01" value={form.minPurchase} onChange={(e) => setForm((f) => ({ ...f, minPurchase: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Expires at (optional)</Label>
              <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <p className="text-sm font-medium">New users only</p>
                <p className="text-xs text-muted-foreground">Only accounts with no prior server purchase</p>
              </div>
              <Switch checked={form.newUsersOnly} onCheckedChange={(v) => setForm((f) => ({ ...f, newUsersOnly: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <p className="text-sm font-medium">Active</p>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
