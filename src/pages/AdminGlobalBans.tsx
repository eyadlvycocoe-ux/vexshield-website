import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { apiUrl, apiMutationHeaders, ensureMutationCsrf } from "@/lib/api-base";
import { ArrowLeft, RefreshCw, Plus, Ban, UserCheck, MoreHorizontal, Trash2, Edit  } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface GlobalBan {
  id: string;
  discord_id: string | null;
  email: string | null;
  ip_address: string | null;
  username: string | null;
  reason: string;
  banned_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  metadata: any;
  banned_username: string | null;
  user_email: string | null;
}

export default function AdminGlobalBans() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [bans, setBans] = useState<GlobalBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBan, setSelectedBan] = useState<GlobalBan | null>(null);
  
  const [formData, setFormData] = useState({
    discord_id: "",
    email: "",
    ip_address: "",
    username: "",
    reason: "",
    expires_at: ""
  });

  const loadBans = async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/global-bans"), {
        credentials: "include",
        headers: { "X-AirCore-Client": "1" }
      });
      if (!res.ok) throw new Error("Failed to load bans");
      const data = await res.json();
      setBans(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load bans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadBans();
  }, [staffOk, staffChecking]);

  const refresh = async () => {
    setRefreshing(true);
    await loadBans();
    setRefreshing(false);
    toast.success("Bans refreshed");
  };

  const createBan = async () => {
    if (!formData.reason) {
      toast.error("Reason is required");
      return;
    }
    if (!formData.discord_id && !formData.email && !formData.ip_address) {
      toast.error("At least one of Discord ID, Email, or IP Address is required");
      return;
    }
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl("/api/admin/global-bans"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          discord_id: formData.discord_id || null,
          email: formData.email || null,
          ip_address: formData.ip_address || null,
          username: formData.username || null,
          reason: formData.reason,
          expires_at: formData.expires_at || null
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create ban");
      }
      toast.success("Ban created successfully");
      setCreateModalOpen(false);
      setFormData({
        discord_id: "",
        email: "",
        ip_address: "",
        username: "",
        reason: "",
        expires_at: ""
      });
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create ban");
    }
  };

  const updateBan = async () => {
    if (!selectedBan) return;
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/admin/global-bans/${selectedBan.id}`), {
        method: "PUT",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          discord_id: formData.discord_id || null,
          email: formData.email || null,
          ip_address: formData.ip_address || null,
          username: formData.username || null,
          reason: formData.reason,
          expires_at: formData.expires_at || null
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update ban");
      }
      toast.success("Ban updated successfully");
      setEditModalOpen(false);
      setSelectedBan(null);
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update ban");
    }
  };

  const toggleBanActive = async (ban: GlobalBan) => {
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/admin/global-bans/${ban.id}`), {
        method: "PUT",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ is_active: !ban.is_active })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update ban");
      }
      toast.success(`Ban ${ban.is_active ? "deactivated" : "activated"} successfully`);
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update ban");
    }
  };

  const deleteBan = async (ban: GlobalBan) => {
    if (!confirm("Are you sure you want to delete this ban?")) return;
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/admin/global-bans/${ban.id}`), {
        method: "DELETE",
        credentials: "include",
        headers: apiMutationHeaders()
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete ban");
      }
      toast.success("Ban deleted successfully");
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete ban");
    }
  };

  const openEditModal = (ban: GlobalBan) => {
    setSelectedBan(ban);
    setFormData({
      discord_id: ban.discord_id || "",
      email: ban.email || "",
      ip_address: ban.ip_address || "",
      username: ban.username || "",
      reason: ban.reason,
      expires_at: ban.expires_at ? new Date(ban.expires_at).toISOString().slice(0, 16) : ""
    });
    setEditModalOpen(true);
  };

  const filteredBans = bans.filter(ban => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (ban.discord_id && ban.discord_id.toLowerCase().includes(term)) ||
      (ban.email && ban.email.toLowerCase().includes(term)) ||
      (ban.ip_address && ban.ip_address.toLowerCase().includes(term)) ||
      (ban.username && ban.username.toLowerCase().includes(term)) ||
      (ban.reason && ban.reason.toLowerCase().includes(term))
    );
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString() + " " + new Date(date).toLocaleTimeString();
  };

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access...
      </div>
    );
  }
  if (!staffOk) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground px-6">
        <p>Admin access required.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Ban className="h-8 w-8 text-destructive" />
                Global Bans
              </h1>
              <p className="text-muted-foreground">Manage global bans by Discord ID, Email, and IP Address</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={refresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ban
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Global Ban</DialogTitle>
                  <DialogDescription>
                    Ban a user by Discord ID, Email, or IP Address. Provide at least one identifier.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="discord_id">Discord ID</Label>
                    <Input
                      id="discord_id"
                      value={formData.discord_id}
                      onChange={(e) => setFormData({ ...formData, discord_id: e.target.value })}
                      placeholder="e.g., 123456789012345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ip_address">IP Address</Label>
                    <Input
                      id="ip_address"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                      placeholder="e.g., 192.168.1.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (optional)</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Display name for reference"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Why the user is being banned"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expires At (optional)</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                  <Button onClick={createBan}>Create Ban</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Discord ID, Email, IP, Username, or Reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading bans...</p>
            </div>
          ) : filteredBans.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{searchTerm ? "No bans found matching your search" : "No bans yet"}</p>
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead className="w-[150px]">Discord ID</TableHead>
                  <TableHead className="w-[200px]">Email</TableHead>
                  <TableHead className="w-[130px]">IP Address</TableHead>
                  <TableHead className="w-[250px]">Reason</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBans.map((ban) => (
                  <TableRow key={ban.id}>
                    <TableCell className="px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {ban.banned_username || ban.username || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDate(ban.created_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded block truncate" title={ban.discord_id || ""}>
                        {ban.discord_id || "—"}
                      </code>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className="text-sm truncate block" title={ban.email || ""}>
                        {ban.email || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className="text-sm truncate block" title={ban.ip_address || ""}>
                        {ban.ip_address || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ban.reason}
                      </p>
                      {ban.expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {formatDate(ban.expires_at)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge variant={ban.is_active ? "destructive" : "secondary"}>
                        {ban.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(ban)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleBanActive(ban)}>
                            {ban.is_active ? <UserCheck className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                            {ban.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteBan(ban)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Ban</DialogTitle>
            <DialogDescription>
              Update the ban details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-discord_id">Discord ID</Label>
              <Input
                id="edit-discord_id"
                value={formData.discord_id}
                onChange={(e) => setFormData({ ...formData, discord_id: e.target.value })}
                placeholder="e.g., 123456789012345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ip_address">IP Address</Label>
              <Input
                id="edit-ip_address"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="e.g., 192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Display name for reference"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reason">Reason</Label>
              <Input
                id="edit-reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Why the user is banned"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expires_at">Expires At</Label>
              <Input
                id="edit-expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
            {selectedBan && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <Label htmlFor="is-active" className="m-0">Active</Label>
                <Switch
                  id="is-active"
                  checked={selectedBan.is_active}
                  onCheckedChange={(checked) => {
                    setSelectedBan({ ...selectedBan, is_active: checked });
                    toggleBanActive({ ...selectedBan, is_active: !selectedBan.is_active });
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={updateBan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
