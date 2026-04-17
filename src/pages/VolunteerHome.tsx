import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, AlertCircle, Users, Bell, Droplets, Trash2, Zap, Construction, MapPin, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

const quickActions = [
  { icon: FileText, label: "Report Issue", desc: "Submit a new complaint", path: "/report" },
  { icon: AlertCircle, label: "Active Issues", desc: "Track your complaints", path: "/issues" },
  { icon: Users, label: "Volunteers", desc: "Helpers nearby", path: "/issues" },
  { icon: Bell, label: "Notifications", desc: "Alerts & updates", path: "/notifications" },
];

const categories = [
  { icon: Droplets, label: "Drainage", key: "drainage" },
  { icon: Trash2, label: "Garbage", key: "garbage" },
  { icon: Zap, label: "Electrical", key: "electrical" },
  { icon: Construction, label: "Road", key: "road" },
];

export default function VolunteerHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from("issues").select("category");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((d) => { counts[d.category] = (counts[d.category] || 0) + 1; });
        setCategoryCounts(counts);
      }
    };
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setFullName(data?.full_name || user.email?.split("@")[0] || "Volunteer");
    };
    fetchCounts();
    fetchProfile();
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const day = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <div className="gradient-hero text-primary-foreground p-6 pb-8 rounded-b-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80">{day}</p>
            <h1 className="text-2xl font-bold mt-1">{greeting}, {fullName} 👋</h1>
            <p className="text-sm opacity-80 mt-1">Report urban issues in your area</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={signOut}
            className="text-primary-foreground hover:bg-primary-foreground/20 gap-1"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs opacity-70">
          <MapPin className="w-3 h-3" />
          <span>Auto-detecting location...</span>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="bg-card rounded-xl p-4 shadow-card text-left hover:shadow-card-hover transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <action.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-sm text-card-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* Trending Categories */}
        <div>
          <h2 className="font-bold text-foreground mb-3">Trending Categories</h2>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => navigate("/issues")}
                className="bg-card rounded-xl p-3 shadow-card flex flex-col items-center gap-2 hover:shadow-card-hover transition-shadow"
              >
                <cat.icon className="w-6 h-6 text-secondary" />
                <div className="text-center">
                  <p className="text-xs font-semibold text-card-foreground">{cat.label}</p>
                  <p className="text-[10px] text-muted-foreground">{categoryCounts[cat.key] || 0} reports</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
