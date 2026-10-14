import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, ArrowLeft, Plus, Trash2, Users, Shield, Search, UserX, FileText  } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface StaffAccess {
  id: number;
  admin_id: string;
  server_custom_id: string;
}

interface BlacklistedUser {
  id: number;
  discord_id: string;
  username: string | null;
  reason: string | null;
  banned_by: string | null;
  added_at: string | null;
  last_ban_date: string | null;
  discord_tag: string | null;
}

interface BlacklistedProof {
  id: number;
  user_id: number | null;
  proof_url: string | null;
  server_name: string | null;
}

export default function AdminAirEye() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [activeTab, setActiveTab] = useState<'staff' | 'blacklist'>('staff');
  
  // Staff state
  const [staffList, setStaffList] = useState<StaffAccess[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ admin_id: '', server_custom_id: '' });
  
  // Blacklist state
  const [blacklistedUsers, setBlacklistedUsers] = useState<BlacklistedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<BlacklistedUser | null>(null);
  const [userProofs, setUserProofs] = useState<BlacklistedProof[]>([]);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [newBlacklist, setNewBlacklist] = useState({ discord_id: '', username: '', reason: '', proof_url: '', server_name: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadStaff();
    loadBlacklistedUsers();
  }, [staffOk, staffChecking]);

  // ---- Staff CRUD ----
  const loadStaff = async () => {
    const { data } = await supabase.from('bot_staff_access').select('*');
    if (data) setStaffList(data);
  };

  const handleAddStaff = async () => {
    if (!newStaff.admin_id || !newStaff.server_custom_id) {
      toast.error("Both fields are required"); return;
    }
    const { error } = await supabase.from('bot_staff_access').insert({
      admin_id: newStaff.admin_id,
      server_custom_id: newStaff.server_custom_id,
    });
    if (error) { toast.error("Failed to add staff"); return; }
    toast.success("Staff member added");
    setShowAddStaffModal(false);
    setNewStaff({ admin_id: '', server_custom_id: '' });
    loadStaff();
  };

  const handleRemoveStaff = async (id: number) => {
    if (!confirm("Remove this staff member?")) return;
    const { error } = await supabase.from('bot_staff_access').delete().eq('id', id);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success("Staff removed");
    loadStaff();
  };

  // ---- Blacklist CRUD ----
  const loadBlacklistedUsers = async () => {
    const { data } = await supabase.from('blacklisted_users').select('*').order('added_at', { ascending: false });
    if (data) setBlacklistedUsers(data);
  };

  const loadProofs = async (userId: number) => {
    const { data } = await supabase.from('blacklisted_proofs').select('*').eq('user_id', userId);
    if (data) setUserProofs(data);
  };

  const handleViewUser = async (user: BlacklistedUser) => {
    setSelectedUser(user);
    await loadProofs(user.id);
  };

  const handleBlacklistUser = async () => {
    if (!newBlacklist.discord_id || !newBlacklist.reason) {
      toast.error("Discord ID and reason are required"); return;
    }
    const now = new Date().toISOString();
    const { data: uData, error: uErr } = await supabase.from('blacklisted_users').upsert({
      discord_id: newBlacklist.discord_id,
      username: newBlacklist.username || null,
      reason: newBlacklist.reason,
      added_at: now,
      last_ban_date: now,
      banned_by: 'admin-panel',
    }, { onConflict: 'discord_id' }).select();

    if (uErr || !uData?.length) { toast.error("Failed to blacklist user"); return; }

    if (newBlacklist.proof_url) {
      await supabase.from('blacklisted_proofs').insert({
        user_id: uData[0].id,
        proof_url: newBlacklist.proof_url,
        server_name: newBlacklist.server_name || 'Admin Panel',
      });
    }

    toast.success("User blacklisted successfully");
    setShowBlacklistModal(false);
    setNewBlacklist({ discord_id: '', username: '', reason: '', proof_url: '', server_name: '' });
    loadBlacklistedUsers();
  };

  const handleUnblacklist = async (user: BlacklistedUser) => {
    if (!confirm(`Remove ${user.username || user.discord_id} from blacklist?`)) return;
    await supabase.from('blacklisted_proofs').delete().eq('user_id', user.id);
    const { error } = await supabase.from('blacklisted_users').delete().eq('id', user.id);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success("User removed from blacklist");
    setSelectedUser(null);
    loadBlacklistedUsers();
  };

  const filteredUsers = blacklistedUsers.filter(u =>
    !searchQuery || 
    u.discord_id.includes(searchQuery) || 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access...
      </div>
    );
  }
  if (!staffOk) return null;

  return (
    <div className="min-h-screen p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.12),transparent_50%)] pointer-events-none" />
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Air Eye Management</h1>
              <p className="text-sm text-muted-foreground">Manage global staff & blacklisted users (synced with Discord bot)</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'staff' ? 'default' : 'outline'}
            onClick={() => setActiveTab('staff')}
          >
            <Users className="h-4 w-4 mr-2" />
            Global Staff
          </Button>
          <Button
            variant={activeTab === 'blacklist' ? 'default' : 'outline'}
            onClick={() => setActiveTab('blacklist')}
          >
            <Shield className="h-4 w-4 mr-2" />
            Blacklisted Users
          </Button>
        </div>

        {/* ===== STAFF TAB ===== */}
        {activeTab === 'staff' && (
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Global Bot Staff
                  </CardTitle>
                  <CardDescription>Users with access to Air Eye bot commands (bot_staff_access table)</CardDescription>
                </div>
                <Button onClick={() => setShowAddStaffModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {staffList.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No global staff members yet.</p>
              ) : (
                <div className="space-y-3">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium font-mono">{staff.admin_id}</p>
                          <p className="text-sm text-muted-foreground">Server: <Badge variant="outline">{staff.server_custom_id}</Badge></p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveStaff(staff.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== BLACKLIST TAB ===== */}
        {activeTab === 'blacklist' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User list */}
            <div className="lg:col-span-2">
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Blacklisted Users
                      </CardTitle>
                      <CardDescription>{blacklistedUsers.length} users blacklisted</CardDescription>
                    </div>
                    <Button onClick={() => setShowBlacklistModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Blacklist User
                    </Button>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Discord ID or username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No blacklisted users found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedUser?.id === user.id ? 'border-primary bg-primary/10' : 'bg-background/50 hover:bg-muted/50'
                          }`}
                          onClick={() => handleViewUser(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                              <UserX className="w-4 h-4 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.username || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.discord_id}</p>
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-xs">Blacklisted</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User detail panel */}
            <div>
              <Card className="border-primary/20 bg-card/50 backdrop-blur sticky top-8">
                <CardHeader>
                  <CardTitle className="text-lg">User Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedUser ? (
                    <p className="text-muted-foreground text-sm text-center py-8">Select a user to view details</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Username</Label>
                        <p className="font-medium">{selectedUser.username || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Discord ID</Label>
                        <p className="font-mono text-sm">{selectedUser.discord_id}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <p className="text-sm">{selectedUser.reason || 'No reason'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Banned By</Label>
                        <p className="text-sm font-mono">{selectedUser.banned_by || 'Unknown'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Added</Label>
                        <p className="text-sm">{selectedUser.added_at ? new Date(selectedUser.added_at).toLocaleString() : 'N/A'}</p>
                      </div>

                      {/* Proofs */}
                      {userProofs.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Evidence ({userProofs.length})</Label>
                          <div className="space-y-2 mt-1">
                            {userProofs.map((proof) => (
                              <div key={proof.id} className="p-2 rounded border bg-background/50 text-sm">
                                <p className="text-muted-foreground text-xs">Server: {proof.server_name || 'Unknown'}</p>
                                {proof.proof_url && (
                                  <a href={proof.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    View Proof
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button variant="destructive" className="w-full" onClick={() => handleUnblacklist(selectedUser)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Blacklist
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Add Staff Modal */}
        <Dialog open={showAddStaffModal} onOpenChange={setShowAddStaffModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Global Staff</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Discord User ID</Label>
                <Input
                  placeholder="e.g. 1234567890123456789"
                  value={newStaff.admin_id}
                  onChange={(e) => setNewStaff({ ...newStaff, admin_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Server Name / ID</Label>
                <Input
                  placeholder="e.g. RedZone RP or VexShield-XXXX"
                  value={newStaff.server_custom_id}
                  onChange={(e) => setNewStaff({ ...newStaff, server_custom_id: e.target.value })}
                />
              </div>
              <Button onClick={handleAddStaff} className="w-full">Add Staff</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Blacklist User Modal */}
        <Dialog open={showBlacklistModal} onOpenChange={setShowBlacklistModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Blacklist User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Discord User ID *</Label>
                <Input
                  placeholder="e.g. 1234567890123456789"
                  value={newBlacklist.discord_id}
                  onChange={(e) => setNewBlacklist({ ...newBlacklist, discord_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Username</Label>
                <Input
                  placeholder="Discord username"
                  value={newBlacklist.username}
                  onChange={(e) => setNewBlacklist({ ...newBlacklist, username: e.target.value })}
                />
              </div>
              <div>
                <Label>Reason *</Label>
                <Input
                  placeholder="Reason for blacklisting"
                  value={newBlacklist.reason}
                  onChange={(e) => setNewBlacklist({ ...newBlacklist, reason: e.target.value })}
                />
              </div>
              <div>
                <Label>Proof URL</Label>
                <Input
                  placeholder="Link to evidence (image/video)"
                  value={newBlacklist.proof_url}
                  onChange={(e) => setNewBlacklist({ ...newBlacklist, proof_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Server Name</Label>
                <Input
                  placeholder="Which server reported this"
                  value={newBlacklist.server_name}
                  onChange={(e) => setNewBlacklist({ ...newBlacklist, server_name: e.target.value })}
                />
              </div>
              <Button onClick={handleBlacklistUser} className="w-full">Blacklist User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

