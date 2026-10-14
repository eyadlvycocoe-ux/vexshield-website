import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LifeBuoy,
  Send,
  Plus,
  RefreshCw,
  Globe,
  Settings,
  Shield,
  MessageSquare,
  CheckCircle,
  XCircle,
 } from "lucide-react";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureMutationCsrf } from "@/lib/api-base";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

type TicketCategory = "reset_ip" | "general_help" | "configuration_help" | "anticheat_setup";

interface Ticket {
  id: string;
  server_id: string;
  server_name?: string;
  user_id: string;
  category: TicketCategory;
  subject: string;
  status: string;
  claimed_by?: string | null;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  is_staff: number | boolean;
  created_at: string;
  user_id: string;
}

interface AccessRequest {
  id: string;
  server_id: string;
  support_user_id: string;
  status: string;
  support_username?: string | null;
  support_display_name?: string | null;
  requested_at: string;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  reset_ip: "Reset IP",
  general_help: "Help & Support",
  configuration_help: "Configuration Help",
  anticheat_setup: "Anti-cheat Setup",
};

export default function DashboardSupport() {
  const { serverId } = useParams();
  const { isOwner } = useAdminPermissions();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "chat">("list");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [category, setCategory] = useState<TicketCategory>("general_help");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sid = String(serverId || "").trim();

  useEffect(() => {
    if (!sid) return;
    void loadTickets();
    if (isOwner) void loadAccessRequests();
  }, [sid, isOwner]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (view !== "chat" || !selected || selected.status === "closed") return;
    const interval = window.setInterval(() => void loadMessages(selected.id, true), 5000);
    return () => window.clearInterval(interval);
  }, [view, selected]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/desk/tickets?server_id=${encodeURIComponent(sid)}`), {
        credentials: "include",
      });
      if (res.ok) setTickets(await res.json());
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const loadAccessRequests = async () => {
    try {
      const res = await fetch(apiUrl(`/desk/access-requests?server_id=${encodeURIComponent(sid)}`), {
        credentials: "include",
      });
      if (res.ok) setAccessRequests(await res.json());
    } catch {
      /* ignore */
    }
  };

  const loadMessages = async (ticketId: string, silent = false) => {
    try {
      const res = await fetch(apiUrl(`/desk/tickets/${ticketId}/messages`), {
        credentials: "include",
      });
      if (res.ok) setMessages(await res.json());
    } catch {
      if (!silent) toast.error("Failed to load messages");
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setCreating(true);
    try {
      const postTicket = async () => {
        await ensureMutationCsrf();
        return fetch(apiUrl("/desk/tickets"), {
          method: "POST",
          credentials: "include",
          headers: apiMutationHeaders(),
          body: JSON.stringify({
            server_id: sid,
            category,
            subject: subject.trim(),
            message: message.trim(),
          }),
        });
      };

      let res = await postTicket();
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const errMsg = String((j as { error?: string }).error || "");
        if (res.status === 403 && /csrf/i.test(errMsg)) {
          await ensureMutationCsrf();
          res = await postTicket();
        }
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Create failed");
      }
      toast.success("Ticket created");
      setSubject("");
      setMessage("");
      setView("list");
      await loadTickets();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/desk/tickets/${selected.id}/messages`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) throw new Error("Send failed");
      setReply("");
      await loadMessages(selected.id, true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const respondAccess = async (requestId: string, status: "approved" | "denied") => {
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/desk/access-requests/${requestId}`), {
        method: "PATCH",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(status === "approved" ? "Access approved" : "Access denied");
      await loadAccessRequests();
    } catch {
      toast.error("Failed to update request");
    }
  };

  const openTicket = (t: Ticket) => {
    setSelected(t);
    setView("chat");
    void loadMessages(t.id);
  };

  const getCategoryIcon = (cat: TicketCategory) => {
    switch (cat) {
      case "reset_ip":
        return <Globe className="h-4 w-4 text-sky-400" />;
      case "configuration_help":
        return <Settings className="h-4 w-4 text-amber-400" />;
      case "anticheat_setup":
        return <Shield className="h-4 w-4 text-emerald-400" />;
      default:
        return <LifeBuoy className="h-4 w-4 text-blue-400" />;
    }
  };

  const pendingAccess = accessRequests.filter((r) => r.status === "pending");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-sky-400" />
            Support Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Request help from VexShield support for this panel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadTickets()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Reload
          </Button>
          {view === "list" ? (
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="h-4 w-4 mr-1" />
              New Ticket
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setView("list")}>
              Back
            </Button>
          )}
        </div>
      </div>

      {isOwner && pendingAccess.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-200">Support access requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAccess.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <div>
                  <p className="text-sm text-white">
                    {req.support_display_name || req.support_username || req.support_user_id}
                  </p>
                  <p className="text-xs text-slate-400">Requested panel access</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void respondAccess(req.id, "approved")}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void respondAccess(req.id, "denied")}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {view === "create" ? (
        <Card className="border-white/10 bg-card/40 max-w-2xl">
          <CardHeader>
            <CardTitle>Create support ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue..."
                rows={5}
              />
            </div>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              Submit ticket
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view === "list" ? (
        <div className="grid gap-3">
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : tickets.length === 0 ? (
            <Card className="border-white/10 bg-card/30 p-8 text-center text-slate-400">
              No tickets yet. Create one to contact support.
            </Card>
          ) : (
            tickets.map((t) => (
              <Card
                key={t.id}
                className="border-white/10 bg-card/40 cursor-pointer hover:border-sky-500/30 transition-colors"
                onClick={() => openTicket(t)}
              >
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {getCategoryIcon(t.category)}
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{t.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{CATEGORY_LABELS[t.category]}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {t.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {view === "chat" && selected ? (
        <Card className="border-white/10 bg-card/40 flex flex-col flex-1 min-h-[420px]">
          <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selected.subject}
            </CardTitle>
            <p className="text-xs text-slate-400">{CATEGORY_LABELS[selected.category]}</p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-4 gap-3 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map((msg) => {
                const staff = msg.is_staff === true || msg.is_staff === 1;
                return (
                  <div key={msg.id} className={`flex ${staff ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        staff ? "bg-sky-500/15 text-sky-100" : "bg-white/10 text-white"
                      }`}
                    >
                      <p className="text-[10px] opacity-70 mb-1">{staff ? "Support" : "You"}</p>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            {selected.status !== "closed" ? (
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void handleSendReply()}
                />
                <Button onClick={() => void handleSendReply()} disabled={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center">This ticket is closed.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
