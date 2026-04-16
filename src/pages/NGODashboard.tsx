import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import StatusTimeline from "@/components/StatusTimeline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, MapPin, Clock, Eye } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Issue = Database["public"]["Tables"]["issues"]["Row"];

export default function NGODashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tab, setTab] = useState<"pending" | "active" | "verify" | "closed">("pending");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });
    setIssues(data || []);
  };

  useEffect(() => {
    fetchIssues();
    const channel = supabase
      .channel("ngo-issues")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => fetchIssues())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAccept = async (issue: Issue) => {
    if (!user) return;
    const { error } = await supabase.from("issues").update({ status: "accepted", assigned_ngo: user.id }).eq("id", issue.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("issue_history").insert({ issue_id: issue.id, action: "accepted", performed_by: user.id, details: "NGO accepted the issue" });
    toast({ title: "Issue Accepted", description: "Forwarded to workers." });
  };

  const handleDecline = async (issue: Issue) => {
    if (!user) return;
    const { error } = await supabase.from("issues").update({ status: "declined", assigned_ngo: user.id }).eq("id", issue.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("issue_history").insert({ issue_id: issue.id, action: "declined", performed_by: user.id, details: "NGO declined the issue" });
    toast({ title: "Issue Declined" });
  };

  const handleVerifyClose = async (issue: Issue) => {
    if (!user) return;
    const { error } = await supabase.from("issues").update({ ngo_verified: true, status: "closed" }).eq("id", issue.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("issue_history").insert({ issue_id: issue.id, action: "closed", performed_by: user.id, details: "NGO verified and closed the issue" });
    toast({ title: "Issue Closed" });
  };

  const pending = issues.filter((i) => i.status === "reported");
  const active = issues.filter((i) => ["accepted", "on_the_way", "work_in_progress", "completed"].includes(i.status));
  const needsVerification = issues.filter((i) => i.status === "verified" && !i.ngo_verified);
  const closed = issues.filter((i) => ["declined", "closed"].includes(i.status));

  const tabData = {
    pending: { items: pending, label: "Pending Review" },
    active: { items: active, label: "Active" },
    verify: { items: needsVerification, label: "To Verify" },
    closed: { items: closed, label: "Closed" },
  };

  const currentItems = tabData[tab].items;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero header - distinct NGO style */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground p-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">NGO Control Panel</p>
            <h1 className="text-2xl font-bold mt-1">Issue Management</h1>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          {[
            { key: "pending" as const, count: pending.length, label: "Pending" },
            { key: "active" as const, count: active.length, label: "Active" },
            { key: "verify" as const, count: needsVerification.length, label: "Verify" },
            { key: "closed" as const, count: closed.length, label: "Closed" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-3 py-2 text-center flex-1 transition-colors ${
                tab === t.key
                  ? "bg-primary-foreground/30 ring-1 ring-primary-foreground/50"
                  : "bg-primary-foreground/10"
              }`}
            >
              <p className="text-lg font-bold">{t.count}</p>
              <p className="text-[10px] opacity-80">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <h2 className="font-bold text-foreground">{tabData[tab].label}</h2>

        {currentItems.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No issues in this category</p>
        )}

        {currentItems.map((issue) => (
          <div key={issue.id} className="bg-card rounded-xl p-4 shadow-card space-y-3">
            <button
              onClick={() => navigate(`/issue/${issue.id}`)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-card-foreground">{issue.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{issue.category}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground capitalize">
                  {issue.status.replace(/_/g, " ")}
                </span>
              </div>
              {issue.address && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {issue.address}
                </div>
              )}
              <StatusTimeline status={issue.status} />
            </button>

            {/* Accept / Decline for pending issues ONLY */}
            {tab === "pending" && issue.status === "reported" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => handleAccept(issue)} className="flex-1 gap-1">
                  <CheckCircle className="w-4 h-4" /> Accept
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDecline(issue)} className="flex-1 gap-1">
                  <XCircle className="w-4 h-4" /> Decline
                </Button>
              </div>
            )}

            {/* Verify & Close for verified issues */}
            {tab === "verify" && issue.status === "verified" && !issue.ngo_verified && (
              <Button size="sm" onClick={() => handleVerifyClose(issue)} className="w-full gap-1">
                <CheckCircle className="w-4 h-4" /> Verify & Close Issue
              </Button>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
