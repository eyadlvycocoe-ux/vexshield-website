import { useState, useEffect } from "react";
import { Bell, Check, Info  } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useTranslation } from "react-i18next";

type Notification = {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { t } = useTranslation();
  const { user } = useUserAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      if (res.error) throw res.error;
      const data = res.data as Notification[];
      setNotifications(data || []);
      setUnreadCount(data ? data.filter((n) => !n.is_read).length : 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    
    // We would ideally do an update with an IN clause or custom route,
    // For now we will update them individually because MySqlClient expects singular updates
    for (const id of unreadIds) {
       await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
    await fetchNotifications();
  };

  const markAsRead = async (id: string, actionUrl: string | null) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (actionUrl) {
      window.location.href = actionUrl;
    } else {
      fetchNotifications();
    }
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-300 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-[#0b1120]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] rounded-xl border border-white/10 bg-[#0a0e14]/95 p-0 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/5 p-3">
          <div className="font-semibold text-white">{t("notifications.title")}</div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 text-xs text-sky-400 hover:text-sky-300">
              <Check className="mr-1 h-3 w-3" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">{t("notifications.empty")}</div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id, notif.action_url)}
                className={`flex cursor-pointer gap-3 border-b border-white/5 p-3 transition-colors hover:bg-white/[0.04] ${
                  !notif.is_read ? "bg-sky-500/[0.05]" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${!notif.is_read ? "bg-sky-500/20 text-sky-400" : "bg-white/5 text-slate-400"}`}>
                    <Info className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{notif.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{notif.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
