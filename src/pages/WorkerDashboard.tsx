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

  const openInNewTab = (url: string) => {
    const win = window.open("about:blank", "_blank");
    if (win) win.location.href = url;
    else window.location.href = url;
  };

  const fetchIssues = async () => {
    if (!user) {
      setIssues([]);
      return;
    }

    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .or(`assigned_worker.eq.${user.id},and(assigned_worker.is.null,status.eq.accepted)`)
      .in("status", ["accepted", "on_the_way", "work_in_progress"])
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setIssues(data || []);
  };

  useEffect(() => {
    if (!user) return;

    void fetchIssues();
    const channel = supabase
      .channel(`worker-issues-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => {
        void fetchIssues();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const handleStatus = async (issue: Issue, newStatus: "on_the_way" | "work_in_progress" | "completed") => {
    if (!user) return;

    const update: Database["public"]["Tables"]["issues"]["Update"] = {
      status: newStatus,
      assigned_worker: issue.assigned_worker ?? user.id,
    };

    const { data, error } = await supabase
      .from("issues")
      .update(update)
      .eq("id", issue.id)
      .select("id");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: "Not allowed", description: "You don't have permission to update this task.", variant: "destructive" });
      return;
    }

    await supabase.from("issue_history").insert({
      issue_id: issue.id,
      action: newStatus,
      performed_by: user.id,
      details: `Worker updated status to ${newStatus.replace(/_/g, " ")}`,
    });

    toast({ title: `Status: ${newStatus.replace(/_/g, " ")}` });
    void fetchIssues();
  };

  const handleDirections = (issue: Issue) => {
    const destination = issue.latitude && issue.longitude
      ? `${issue.latitude},${issue.longitude}`
      : encodeURIComponent(issue.address || "");

    if (!destination) {
      toast({ title: "No location found", description: "This issue does not have a location yet.", variant: "destructive" });
      return;
    }

    const openGoogleDirections = (origin?: string) => {
      const originParam = origin ? `&origin=${origin}` : "";
      openInNewTab(`https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving`);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => openGoogleDirections(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => {
          toast({ title: "Location blocked", description: "Opening route without your current location." });
          openGoogleDirections();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
      return;
    }

    openGoogleDirections();
  };

  const handleOpenMap = (issue: Issue) => {
    if (issue.latitude && issue.longitude) {
      openInNewTab(`https://www.openstreetmap.org/?mlat=${issue.latitude}&mlon=${issue.longitude}#map=18/${issue.latitude}/${issue.longitude}`);
      return;
    }

    if (issue.address) {
      openInNewTab(`https://www.openstreetmap.org/search?query=${encodeURIComponent(issue.address)}`);
      return;
    }

    toast({ title: "No location found", description: "This issue does not have a location yet.", variant: "destructive" });
  };

  const getActionButton = (issue: Issue) => {
    const isMine = !issue.assigned_worker || issue.assigned_worker === user?.id;
    if (!isMine) return null;

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
        <div className="flex items-start justify-between gap-4">
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
            <button onClick={() => navigate(`/issue/${issue.id}`)} className="w-full text-left space-y-2">
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
              <StatusTimeline status={issue.status} />
            </button>

            {(issue.latitude && issue.longitude) || issue.address ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="gap-1" onClick={() => handleDirections(issue)}>
                  <Navigation className="w-4 h-4" /> Get Directions
                </Button>
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => handleOpenMap(issue)}>
                  <MapPin className="w-4 h-4" /> Open Map
                </Button>
              </div>
            ) : null}

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
