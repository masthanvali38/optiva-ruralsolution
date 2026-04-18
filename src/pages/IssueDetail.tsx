import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import StatusTimeline from "@/components/StatusTimeline";
import type { Database } from "@/integrations/supabase/types";

type Issue = Database["public"]["Tables"]["issues"]["Row"];
type History = Database["public"]["Tables"]["issue_history"]["Row"];

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [history, setHistory] = useState<History[]>([]);

  const fetchData = async () => {
    if (!id) return;
    const { data: issueData } = await supabase.from("issues").select("*").eq("id", id).single();
    setIssue(issueData);
    const { data: histData } = await supabase.from("issue_history").select("*").eq("issue_id", id).order("created_at", { ascending: true });
    setHistory(histData || []);
  };

  useEffect(() => {
    fetchData();
    if (!id) return;
    const channel = supabase
      .channel(`issue-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "issues", filter: `id=eq.${id}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "issue_history", filter: `issue_id=eq.${id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const addHistory = async (action: string, details?: string) => {
    if (!user || !id) return;
    await supabase.from("issue_history").insert({
      issue_id: id,
      action,
      performed_by: user.id,
      details,
    });
  };

  const notify = async (userId: string, title: string, message: string) => {
    if (!id) return;
    // We'll insert as the target user via RLS - but our policy requires auth.uid() = user_id
    // So notifications will be created by edge function in production. For now, skip self-notification.
  };

  const handleNGOAccept = async () => {
    if (!issue || !user) return;
    await supabase.from("issues").update({ status: "accepted", assigned_ngo: user.id }).eq("id", issue.id);
    await addHistory("accepted", "NGO accepted the issue");
    toast({ title: "Issue Accepted" });
    fetchData();
  };

  const handleNGODecline = async () => {
    if (!issue || !user) return;
    await supabase.from("issues").update({ status: "declined" }).eq("id", issue.id);
    await addHistory("declined", "NGO declined the issue");
    toast({ title: "Issue Declined" });
    fetchData();
  };

  const handleWorkerStatus = async (newStatus: "on_the_way" | "work_in_progress" | "completed") => {
    if (!issue || !user) return;
    const { error } = await supabase
      .from("issues")
      .update({ status: newStatus, assigned_worker: issue.assigned_worker ?? user.id })
      .eq("id", issue.id)
      .or(`assigned_worker.is.null,assigned_worker.eq.${user.id}`);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await addHistory(newStatus, `Worker updated status to ${newStatus.replace(/_/g, " ")}`);
    toast({ title: `Status: ${newStatus.replace(/_/g, " ")}` });
    fetchData();
  };

  const handleVolunteerVerify = async (satisfied: boolean) => {
    if (!issue || !user) return;
    if (satisfied) {
      await supabase.from("issues").update({ volunteer_verified: true, status: "verified" }).eq("id", issue.id);
      await addHistory("verified", "Volunteer confirmed work completed");
      toast({ title: "Verified! Thank you." });
    } else {
      await supabase.from("issues").update({ volunteer_verified: false, status: "accepted" }).eq("id", issue.id);
      await addHistory("reopened", "Volunteer not satisfied, issue reopened");
      toast({ title: "Issue reopened", variant: "destructive" });
    }
    fetchData();
  };

  const handleNGOClose = async () => {
    if (!issue || !user) return;
    await supabase.from("issues").update({ ngo_verified: true, status: "closed" }).eq("id", issue.id);
    await addHistory("closed", "NGO verified and closed the issue");
    toast({ title: "Issue Closed" });
    fetchData();
  };

  if (!issue) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        {issue.image_url && (
          <img src={issue.image_url} alt={issue.title} className="w-full h-48 object-cover rounded-xl" />
        )}

        <div>
          <h1 className="text-xl font-bold text-foreground">{issue.title}</h1>
          <p className="text-xs text-muted-foreground capitalize mt-1">{issue.category} issue</p>
        </div>

        <StatusTimeline status={issue.status} />

        <div className="bg-card rounded-xl p-4 shadow-card space-y-2">
          <p className="text-sm text-card-foreground">{issue.description}</p>
          {issue.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" /> {issue.address}
            </div>
          )}
        </div>

        {/* NGO Actions */}
        {role === "ngo" && issue.status === "reported" && (
          <div className="flex gap-3">
            <Button onClick={handleNGOAccept} className="flex-1">✅ Accept</Button>
            <Button onClick={handleNGODecline} variant="destructive" className="flex-1">❌ Decline</Button>
          </div>
        )}

        {/* NGO assign worker - simplified: just accept for now */}
        {role === "ngo" && issue.status === "verified" && !issue.ngo_verified && (
          <Button onClick={handleNGOClose} className="w-full">✅ Verify & Close Issue</Button>
        )}

        {/* Worker Actions */}
        {role === "worker" && issue.status === "accepted" && (
          <Button onClick={() => handleWorkerStatus("on_the_way")} className="w-full">🚗 On the Way</Button>
        )}
        {role === "worker" && issue.status === "on_the_way" && (
          <Button onClick={() => handleWorkerStatus("work_in_progress")} className="w-full">🔧 Start Work</Button>
        )}
        {role === "worker" && issue.status === "work_in_progress" && (
          <Button onClick={() => handleWorkerStatus("completed")} className="w-full">✅ Mark Completed</Button>
        )}

        {/* Volunteer Verify */}
        {role === "volunteer" && issue.status === "completed" && issue.reported_by === user?.id && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Is the work completed satisfactorily?</p>
            <div className="flex gap-3">
              <Button onClick={() => handleVolunteerVerify(true)} className="flex-1">✅ Work Completed</Button>
              <Button onClick={() => handleVolunteerVerify(false)} variant="destructive" className="flex-1">❌ Not Satisfied</Button>
            </div>
          </div>
        )}

        {/* History Timeline */}
        <div>
          <h2 className="font-bold text-foreground mb-2">Activity Log</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-2 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-card-foreground">{h.details || h.action}</p>
                  <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-xs text-muted-foreground">No activity yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
