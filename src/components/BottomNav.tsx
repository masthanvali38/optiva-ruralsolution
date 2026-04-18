import { Home, AlertCircle, Building2, HardHat, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, useNavigate } from "react-router-dom";

export default function BottomNav() {
  const { role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = role === "volunteer"
    ? [
        { path: "/", icon: Home, label: "Home" },
        { path: "/issues", icon: AlertCircle, label: "Issues" },
        { path: "/notifications", icon: Bell, label: "Alerts" },
      ]
    : role === "ngo"
      ? [
          { path: "/ngo", icon: Building2, label: "Dashboard" },
          { path: "/notifications", icon: Bell, label: "Alerts" },
        ]
      : [
          { path: "/worker", icon: HardHat, label: "Tasks" },
          { path: "/notifications", icon: Bell, label: "Alerts" },
        ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around max-w-md mx-auto py-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
