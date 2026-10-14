import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ArrowLeft, Pencil, Percent, Plus, RefreshCw, Search, Trash2  } from "lucide-react";
import { apiMutationHeaders, ensureCsrfCookie, getApiBaseUrl } from "@/lib/api-base";
import { promotionLabel, type Promotion, type ProductKey } from "@/lib/promotions";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PricingPlan = {
  id: string;
  plan_name: string;
  duration?: string | null;
  price?: string | number | null;
};

const PRODUCTS: { key: ProductKey; label: string }[] = [
  { key: "airshield", label: "VexShield" },
];

const blankForm = {
  title: "",
  description: "",
  discount_type: "percent" as "percent" | "fixed",
  discount_value: "20",
  target_scope: "all" as "all" | "product" | "package",
  target_product: "airshield" as ProductKey,
  target_package: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function isExpired(promotion: Promotion) {
  return !!promotion.ends_at && new Date(promotion.ends_at) < new Date();
}

function isRunning(promotion: Promotion) {
  if (!promotion.is_active || promotion.is_active === 0) return false;
  if (promotion.starts_at && new Date(promotion.starts_at) > new Date()) return false;
  return !isExpired(promotion);
}

export default function AdminPromotions() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/promotions`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load promotions");
      setPromotions(data.promotions || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    const { data } = await supabase
      .from("pricing_plans")
      .select("id, plan_name, duration, price")
      .order("display_order", { ascending: true });
    setPlans((data || []) as PricingPlan[]);
  };

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    void load();
    void loadPlans();
  }, [staffOk, staffChecking]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) => {
      const target = `${p.title} ${p.description || ""} ${p.target_scope} ${p.target_product || ""} ${p.target_package || ""}`;
      return target.toLowerCase().includes(q);
    });
  }, [promotions, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...blankForm,
      title: "Summer Sale",
    });
    setModalOpen(true);
  };

  const openEdit = (promotion: Promotion) => {
    setEditing(promotion);
    setForm({
      title: promotion.title,
      description: promotion.description || "",
      discount_type: promotion.discount_type,
      discount_value: String(promotion.discount_value),
      target_scope: promotion.target_scope,
      target_product: promotion.target_product || "airshield",
      target_package: promotion.target_package || "",
      starts_at: toInputDate(promotion.starts_at),
      ends_at: toInputDate(promotion.ends_at),
      is_active: promotion.is_active !== false && promotion.is_active !== 0,
    });
    setModalOpen(true);
  };

  const payloadFromForm = () => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    target_scope: form.target_scope,
    target_product: form.target_scope === "product" ? form.target_product : null,
    target_package: form.target_scope === "package" ? form.target_package : null,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    is_active: form.is_active,
  });

  const save = async () => {
    setSaving(true);
    try {
      await ensureCsrfCookie();
      const payload = payloadFromForm();
      const url = editing
        ? `${getApiBaseUrl()}/admin/promotions/${encodeURIComponent(editing.id)}`
        : `${getApiBaseUrl()}/admin/promotions`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save promotion");
      toast.success(editing ? "Promotion updated" : "Promotion created");
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (promotion: Promotion) => {
    if (!confirm(`Delete promotion "${promotion.title}"?`)) return;
    try {
      await ensureCsrfCookie();
      const res = await fetch(`${getApiBaseUrl()}/admin/promotions/${encodeURIComponent(promotion.id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: apiMutationHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete promotion");
      setPromotions((prev) => prev.filter((p) => p.id !== promotion.id));
      toast.success("Promotion deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete promotion");
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Promotions refreshed");
  };

  const targetLabel = (promotion: Promotion) => {
    if (promotion.target_scope === "all") return "All products and packages";
    if (promotion.target_scope === "product") {
      return PRODUCTS.find((p) => p.key === promotion.target_product)?.label || promotion.target_product || "Product";
    }
    return plans.find((p) => p.id === promotion.target_package)?.plan_name || promotion.target_package || "Package";
  };

  if (staffChecking) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verifying access...</div>;
  }
  if (!staffOk) return null;

  return (
    <div className="relative min-h-screen p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold">
                <Percent className="h-8 w-8 text-primary" />
                Promotions
              </h1>
              <p className="text-muted-foreground">
                Sales that automatically update pricing pages and the top banner.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New promotion
            </Button>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 p-4 backdrop-blur-xl">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search promotions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotion</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No promotions found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{promotion.title}</div>
                      {promotion.description ? (
                        <div className="max-w-sm truncate text-xs text-muted-foreground">{promotion.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{promotionLabel(promotion)}</TableCell>
                    <TableCell>{targetLabel(promotion)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>Start: {promotion.starts_at ? new Date(promotion.starts_at).toLocaleString() : "Now"}</div>
                      <div>End: {promotion.ends_at ? new Date(promotion.ends_at).toLocaleString() : "No end"}</div>
                    </TableCell>
                    <TableCell>
                      {isRunning(promotion) ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20">Active</Badge>
                      ) : isExpired(promotion) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : promotion.is_active ? (
                        <Badge variant="outline">Scheduled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(promotion)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void remove(promotion)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit promotion" : "Create promotion"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Discount type</Label>
                <Select value={form.discount_type} onValueChange={(v: "percent" | "fixed") => setForm((p) => ({ ...p, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{form.discount_type === "percent" ? "Percent off" : "Amount off (EUR)"}</Label>
                <Input type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Apply to</Label>
                <Select value={form.target_scope} onValueChange={(v: "all" | "product" | "package") => setForm((p) => ({ ...p, target_scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products and packages</SelectItem>
                    <SelectItem value="product">Specific product</SelectItem>
                    <SelectItem value="package">Specific package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.target_scope === "product" ? (
                <div className="grid gap-2">
                  <Label>Product</Label>
                  <Select value={form.target_product} onValueChange={(v: ProductKey) => setForm((p) => ({ ...p, target_product: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map((product) => (
                        <SelectItem key={product.key} value={product.key}>{product.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {form.target_scope === "package" ? (
                <div className="grid gap-2">
                  <Label>Package</Label>
                  <Select value={form.target_package} onValueChange={(v) => setForm((p) => ({ ...p, target_package: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.plan_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Start date</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>End date</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="font-medium text-foreground">Enabled</div>
                <div className="text-xs text-muted-foreground">Only one enabled global promotion is allowed.</div>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save promotion"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
