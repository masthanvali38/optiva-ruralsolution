import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import StatusTimeline from "@/components/StatusTimeline";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Issue = Database["public"]["Tables"]["issues"]["Row"];

const statusColors: Record<string, string> = {
  reported: "bg-secondary/20 text-secondary",
  accepted: "bg-primary/20 text-primary",
  declined: "bg-destructive/20 text-destructive",
  on_the_way: "bg-accent/20 text-accent",
  work_in_progress: "bg-accent/20 text-accent",
  completed: "bg-primary/20 text-primary",
  verified: "bg-primary/20 text-primary",
  closed: "bg-muted text-muted-foreground",
};

export default function IssuesList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIssues = async () => {
      let query = supabase.from("issues").select("*").order("created_at", { ascending: false });
      if (role === "volunteer" && user) {
        query = query.eq("reported_by", user.id);
      }
      const { data } = await query;
      setIssues(data || []);
    };
    fetchIssues();

    const channel = supabase
      .channel("issues-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => fetchIssues())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, role]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {role === "volunteer" ? "My Issues" : "All Issues"}
        </h1>
        {role === "volunteer" && (
          <Button size="sm" onClick={() => navigate("/report")}>
            <Plus className="w-4 h-4 mr-1" /> Report
          </Button>
        )}
      </div>

      <div className="px-4 space-y-3">
        {issues.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No issues found</p>
        )}
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
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[issue.status] || ""}`}>
                {issue.status.replace(/_/g, " ")}
              </span>
            </div>
            {issue.address && (
              <p className="text-xs text-muted-foreground truncate">{issue.address}</p>
            )}
            <StatusTimeline status={issue.status} />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
