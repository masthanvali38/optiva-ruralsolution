import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import StatusTimeline from "@/components/StatusTimeline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Wrench, CheckCircle, LogOut } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Issue = Database["public"]["Tables"]["issues"]["Row"];

export default function WorkerDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchIssues = async () => {
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

  const handleStatus = async (issue: Issue, newStatus: "on_the_way" | "work_in_progress" | "completed") => {
    if (!user) return;
    const update: any = { status: newStatus };
    if (newStatus === "on_the_way" && !issue.assigned_worker) {
      update.assigned_worker = user.id;
    }
    const { error } = await supabase.from("issues").update(update).eq("id", issue.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("issue_history").insert({
      issue_id: issue.id, action: newStatus, performed_by: user.id,
      details: `Worker updated status to ${newStatus.replace(/_/g, " ")}`,
    });
    toast({ title: `Status: ${newStatus.replace(/_/g, " ")}` });
  };

  const getActionButton = (issue: Issue) => {
    if (issue.status === "accepted") {
      return (
        <Button size="sm" onClick={() => handleStatus(issue, "on_the_way")} className="w-full gap-1">
          <Navigation className="w-4 h-4" /> On the Way
        </Button>
      );
    }
    if (issue.status === "on_the_way") {
      return (
        <Button size="sm" onClick={() => handleStatus(issue, "work_in_progress")} className="w-full gap-1">
          <Wrench className="w-4 h-4" /> Start Work
        </Button>
      );
    }
    if (issue.status === "work_in_progress") {
      return (
        <Button size="sm" onClick={() => handleStatus(issue, "completed")} className="w-full gap-1">
          <CheckCircle className="w-4 h-4" /> Mark Completed
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero text-primary-foreground p-6 pb-8 rounded-b-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">Worker Panel</p>
            <h1 className="text-2xl font-bold mt-1">Assigned Tasks</h1>
            <p className="text-sm opacity-80 mt-1">{issues.length} active task{issues.length !== 1 ? "s" : ""}</p>
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
      </div>

      <div className="px-4 mt-4 space-y-3">
        {issues.map((issue) => (
          <div key={issue.id} className="bg-card rounded-xl p-4 shadow-card space-y-3">
            <button
              onClick={() => navigate(`/issue/${issue.id}`)}
              className="w-full text-left space-y-2"
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {issue.address}
                </div>
              )}
              {issue.latitude && issue.longitude && (
                <a
                  href={`https://maps.google.com/?q=${issue.latitude},${issue.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-primary underline"
                >
                  <MapPin className="w-3 h-3" /> Open in Maps
                </a>
              )}
              <StatusTimeline status={issue.status} />
            </button>

            {getActionButton(issue)}
          </div>
        ))}
        {issues.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No tasks assigned yet</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
