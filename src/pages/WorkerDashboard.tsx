import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import StatusTimeline from "@/components/StatusTimeline";
import type { Database } from "@/integrations/supabase/types";

type Issue = Database["public"]["Tables"]["issues"]["Row"];

export default function WorkerDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchIssues = async () => {
    // Workers see all accepted/in-progress issues (in real app, filter by assigned_worker)
    const { data } = await supabase
      .from("issues")
      .select("*")
      .in("status", ["accepted", "on_the_way", "work_in_progress"])
      .order("created_at", { ascending: false });
    setIssues(data || []);
  };

  useEffect(() => {
    fetchIssues();
    const channel = supabase
      .channel("worker-issues")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => fetchIssues())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero text-primary-foreground p-6 pb-8 rounded-b-3xl">
        <p className="text-sm opacity-80">Worker Dashboard</p>
        <h1 className="text-2xl font-bold mt-1">Assigned Tasks</h1>
        <p className="text-sm opacity-80 mt-1">{issues.length} active task{issues.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => navigate(`/issue/${issue.id}`)}
            className="w-full bg-card rounded-xl p-4 shadow-card text-left space-y-2 hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm text-card-foreground">{issue.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{issue.category}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent/20 text-accent capitalize">
                {issue.status.replace(/_/g, " ")}
              </span>
            </div>
            {issue.address && (
              <p className="text-xs text-muted-foreground">{issue.address}</p>
            )}
            <StatusTimeline status={issue.status} />
          </button>
        ))}
        {issues.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No tasks assigned yet</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
