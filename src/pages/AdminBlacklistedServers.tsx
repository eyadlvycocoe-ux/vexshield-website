import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Trash2, Plus, ArrowLeft, RefreshCw, Ban, Server  } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

interface BlacklistedServer {
  id: string;
  discord_server_id: string;
  server_name?: string;
  reason?: string;
  added_at: string;
  added_by?: string;
}

export default function AdminBlacklistedServers() {
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [servers, setServers] = useState<BlacklistedServer[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newServer, setNewServer] = useState({
    discord_server_id: '',
    server_name: '',
    reason: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadServers();
  }, [staffOk, staffChecking]);

  const loadServers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blacklisted_discord_servers')
      .select('*')
      .order('added_at', { ascending: false });

    if (!error) {
      setServers(data || []);
    }
    setLoading(false);
  };

  const handleAddServer = async () => {
    if (!newServer.discord_server_id.trim()) {
      toast.error("Discord Server ID is required");
      return;
    }

    // Validate Discord server ID (should be numeric)
    if (!/^\d+$/.test(newServer.discord_server_id.trim())) {
      toast.error("Invalid Discord Server ID format");
      return;
    }

    const { error } = await supabase
      .from('blacklisted_discord_servers')
      .insert({
        discord_server_id: newServer.discord_server_id.trim(),
        server_name: newServer.server_name.trim() || null,
        reason: newServer.reason.trim() || null
      });

    if (error) {
      if (error.code === '23505') {
        toast.error("This Discord server is already blacklisted");
      } else {
        toast.error("Failed to add blacklisted server");
      }
      return;
    }

    toast.success("Discord server added to blacklist");
    setShowAddModal(false);
    setNewServer({ discord_server_id: '', server_name: '', reason: '' });
    loadServers();
  };

  const handleDeleteServer = async (server: BlacklistedServer) => {
    if (!confirm(`Remove "${server.server_name || server.discord_server_id}" from blacklist?`)) return;

    const { error } = await supabase
      .from('blacklisted_discord_servers')
      .delete()
      .eq('id', server.id);

    if (error) {
      toast.error("Failed to remove from blacklist");
      return;
    }

    toast.success("Server removed from blacklist");
    loadServers();
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
    <div className="min-h-screen p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.12),transparent_50%)] pointer-events-none" />
      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Ban className="h-8 w-8 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold">Blacklisted Discord Servers</h1>
              <p className="text-sm text-muted-foreground">
                Users in these Discord servers will be blocked from connecting
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-200">How it works</p>
                <p className="text-muted-foreground mt-1">
                  When users log in with Discord, we check if they're a member of any blacklisted servers.
                  If they are, their connection to FiveM servers will be blocked automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Server Button */}
        <Card className="mb-6 border-destructive/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Add Blacklisted Server</CardTitle>
            <CardDescription>Block users who are members of specific Discord servers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddModal(true)} variant="destructive">
              <Plus className="h-4 w-4 mr-2" />
              Add Discord Server
            </Button>
          </CardContent>
        </Card>

        {/* Servers List */}
        <Card className="border-destructive/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Blacklisted Servers ({servers.length})
                </CardTitle>
                <CardDescription>Discord servers that block user connections</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadServers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : servers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No blacklisted servers yet</p>
            ) : (
              <div className="space-y-3">
                {servers.map((server) => (
                  <Card key={server.id} className="bg-background/50 border-destructive/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold">
                              {server.server_name || 'Unnamed Server'}
                            </h4>
                            <Badge variant="destructive" className="text-xs">
                              Blacklisted
                            </Badge>
                          </div>
                          <p className="text-sm font-mono text-muted-foreground">
                            ID: {server.discord_server_id}
                          </p>
                          {server.reason && (
                            <p className="text-sm text-muted-foreground">
                              Reason: {server.reason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Added: {new Date(server.added_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteServer(server)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Server Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Blacklisted Discord Server</DialogTitle>
              <DialogDescription>
                Users in this server will be blocked from connecting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Discord Server ID *</Label>
                <Input
                  placeholder="123456789012345678"
                  value={newServer.discord_server_id}
                  onChange={(e) => setNewServer({ ...newServer, discord_server_id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Right-click the server ? Copy Server ID (requires Developer Mode)
                </p>
              </div>
              <div>
                <Label>Server Name (Optional)</Label>
                <Input
                  placeholder="Cheat Server"
                  value={newServer.server_name}
                  onChange={(e) => setNewServer({ ...newServer, server_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Reason (Optional)</Label>
                <Textarea
                  placeholder="Known cheating community..."
                  value={newServer.reason}
                  onChange={(e) => setNewServer({ ...newServer, reason: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={handleAddServer} className="w-full" variant="destructive">
                <Ban className="h-4 w-4 mr-2" />
                Add to Blacklist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

