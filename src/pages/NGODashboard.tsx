import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import StatusTimeline from "@/components/StatusTimeline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Issue = Database["public"]["Tables"]["issues"]["Row"];

export default function NGODashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
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

  const reported = issues.filter((i) => i.status === "reported");
  const active = issues.filter((i) => !["reported", "declined", "closed"].includes(i.status));
  const needsVerification = issues.filter((i) => i.status === "verified" && !i.ngo_verified);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero text-primary-foreground p-6 pb-8 rounded-b-3xl">
        <p className="text-sm opacity-80">NGO Dashboard</p>
        <h1 className="text-2xl font-bold mt-1">Issue Management</h1>
        <div className="flex gap-4 mt-4">
          <div className="bg-primary-foreground/20 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold">{reported.length}</p>
            <p className="text-[10px] opacity-80">Pending</p>
          </div>
          <div className="bg-primary-foreground/20 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold">{active.length}</p>
            <p className="text-[10px] opacity-80">Active</p>
          </div>
          <div className="bg-primary-foreground/20 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold">{needsVerification.length}</p>
            <p className="text-[10px] opacity-80">To Verify</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {reported.length > 0 && (
          <div>
            <h2 className="font-bold text-foreground mb-2">New Reports</h2>
            {reported.map((issue) => (
              <button
                key={issue.id}
                onClick={() => navigate(`/issue/${issue.id}`)}
                className="w-full bg-card rounded-xl p-4 shadow-card text-left mb-2 hover:shadow-card-hover transition-shadow"
              >
                <p className="font-semibold text-sm text-card-foreground">{issue.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{issue.category} • {issue.address || "No address"}</p>
              </button>
            ))}
          </div>
        )}

        {active.length > 0 && (
          <div>
            <h2 className="font-bold text-foreground mb-2">Active Issues</h2>
            {active.map((issue) => (
              <button
                key={issue.id}
                onClick={() => navigate(`/issue/${issue.id}`)}
                className="w-full bg-card rounded-xl p-4 shadow-card text-left mb-2 space-y-2 hover:shadow-card-hover transition-shadow"
              >
                <p className="font-semibold text-sm text-card-foreground">{issue.title}</p>
                <StatusTimeline status={issue.status} />
              </button>
            ))}
          </div>
        )}

        {issues.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No issues found</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
