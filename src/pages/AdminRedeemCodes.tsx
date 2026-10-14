import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Pencil, Plus, RefreshCw, Search, Trash2, Ticket  } from "lucide-react";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface RedeemCode {
  id: string;
  code: string;
  funds: number;
  uses_remaining: number;
  expires_at: string | null;
  created_at: string;
}

export default function AdminRedeemCodes() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<RedeemCode | null>(null);
  const [form, setForm] = useState({
    code: "",
    funds: "",
    uses: "1",
    expiresAt: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadCodes();
  }, [staffOk, staffChecking]);

  const loadCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('redeem_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load redeem codes');
    } else {
      setCodes((data || []) as RedeemCode[]);
    }
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadCodes();
    setRefreshing(false);
    toast.success('Redeem codes refreshed');
  };

  const filteredCodes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return codes.filter((code) => code.code.toLowerCase().includes(term));
  }, [codes, searchTerm]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const seg = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `VEXSHIELD-${seg()}-${seg()}`;
  };

  const openCreate = () => {
    setEditingCode(null);
    setForm({
      code: generateCode(),
      funds: "",
      uses: "1",
      expiresAt: ""
    });
    setModalOpen(true);
  };

  const openEdit = (code: RedeemCode) => {
    setEditingCode(code);
    setForm({
      code: code.code,
      funds: String(code.funds ?? 0),
      uses: String(code.uses_remaining ?? 1),
      expiresAt: code.expires_at ? new Date(code.expires_at).toISOString().slice(0, 16) : ""
    });
    setModalOpen(true);
  };

  const saveCode = async () => {
    const fundsValue = Number(form.funds);
    const usesValue = Number(form.uses);
    if (!form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (!Number.isFinite(fundsValue) || fundsValue < 0) {
      toast.error('Enter valid funds');
      return;
    }
    if (!Number.isInteger(usesValue) || usesValue < 1) {
      toast.error('Uses must be at least 1');
      return;
    }

    setSaving(true);
    try {
      if (editingCode) {
        const { error } = await supabase
          .from('redeem_codes')
          .update({
            code: form.code.trim(),
            funds: fundsValue,
            uses_remaining: usesValue,
            expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null
          })
          .eq('id', editingCode.id);

        if (error) throw error;
        toast.success('Redeem code updated');
      } else {
        const { error } = await supabase
          .from('redeem_codes')
          .insert({
            code: form.code.trim(),
            funds: fundsValue,
            uses_remaining: usesValue,
            expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null
          });

        if (error) throw error;
        toast.success('Redeem code created');
      }
      setModalOpen(false);
      loadCodes();
    } catch (error: any) {
      console.error('Error saving redeem code:', error);
      toast.error(error.message || 'Failed to save redeem code');
    } finally {
      setSaving(false);
    }
  };

  const deleteCode = async (code: RedeemCode) => {
    if (!confirm(`Delete redeem code ${code.code}?`)) return;
    const { error } = await supabase
      .from('redeem_codes')
      .delete()
      .eq('id', code.id);

    if (error) {
      toast.error('Failed to delete redeem code');
      return;
    }

    setCodes((prev) => prev.filter((c) => c.id !== code.id));
    toast.success('Redeem code deleted');
  };

  const formatFunds = (amount: number) => `${"\u20AC"}${amount.toFixed(2)}`;

  const renderStatus = (code: RedeemCode) => {
    const expired = code.expires_at && new Date(code.expires_at) < new Date();
    const usedUp = code.uses_remaining <= 0;
    if (expired) return <Badge variant="destructive">Expired</Badge>;
    if (usedUp) return <Badge variant="secondary">Used Up</Badge>;
    return <Badge variant="outline">Active</Badge>;
  };

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
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Ticket className="h-8 w-8 text-primary" />
                Redeem Codes
              </h1>
              <p className="text-muted-foreground">Create and manage funds codes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Code
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search redeem code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading redeem codes...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No redeem codes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Funds</TableHead>
                  <TableHead>Uses Left</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{code.code}</code>
                    </TableCell>
                    <TableCell>{formatFunds(code.funds ?? 0)}</TableCell>
                    <TableCell>{code.uses_remaining}</TableCell>
                    <TableCell>
                      {code.expires_at ? new Date(code.expires_at).toLocaleString() : 'No expiry'}
                    </TableCell>
                    <TableCell>{renderStatus(code)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(code)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteCode(code)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Redeem Code' : 'Create Redeem Code'}</DialogTitle>
            <DialogDescription>Configure the code and funds value.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <Button variant="outline" onClick={() => setForm({ ...form, code: generateCode() })}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Funds ($)</label>
              <Input
                type="number"
                min="0"
                value={form.funds}
                onChange={(e) => setForm({ ...form, funds: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Uses</label>
              <Input
                type="number"
                min="1"
                value={form.uses}
                onChange={(e) => setForm({ ...form, uses: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expires At</label>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCode} disabled={saving}>
              {saving ? 'Saving...' : (editingCode ? 'Save Changes' : 'Create Code')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

