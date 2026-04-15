import { useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(data || []);
    };
    fetch();

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4">
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
      </div>

      <div className="px-4 space-y-2">
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              markRead(n.id);
              if (n.issue_id) navigate(`/issue/${n.issue_id}`);
            }}
            className={`w-full text-left p-4 rounded-xl shadow-card transition-shadow hover:shadow-card-hover ${
              n.read ? "bg-card" : "bg-primary/5 border border-primary/20"
            }`}
          >
            <p className="font-semibold text-sm text-card-foreground">{n.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
