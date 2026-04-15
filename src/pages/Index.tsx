import { useAuth } from "@/lib/auth-context";
import RoleSelect from "@/pages/RoleSelect";
import VolunteerHome from "@/pages/VolunteerHome";
import NGODashboard from "@/pages/NGODashboard";
import WorkerDashboard from "@/pages/WorkerDashboard";

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <RoleSelect />;

  if (role === "ngo") return <NGODashboard />;
  if (role === "worker") return <WorkerDashboard />;
  return <VolunteerHome />;
}
