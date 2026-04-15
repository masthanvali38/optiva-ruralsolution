import { useState } from "react";
import { Heart, Building2, HardHat, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import AuthForm from "@/components/AuthForm";

type AppRole = "volunteer" | "ngo" | "worker";

const roles = [
  {
    id: "volunteer" as AppRole,
    title: "Volunteer Login",
    desc: "Report issues in your area and help your community",
    icon: Heart,
    color: "bg-primary",
  },
  {
    id: "ngo" as AppRole,
    title: "NGO Login",
    desc: "Accept reports and assign tasks to field workers",
    icon: Building2,
    color: "bg-secondary",
  },
  {
    id: "worker" as AppRole,
    title: "Worker Login",
    desc: "View assigned tasks and resolve field issues",
    icon: HardHat,
    color: "bg-accent",
  },
];

export default function RoleSelect() {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  if (selectedRole) {
    return <AuthForm role={selectedRole} onBack={() => setSelectedRole(null)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Urban Reporter</h1>
          <p className="text-muted-foreground text-sm">Smart Urban Problem Reporting</p>
        </div>

        <div className="space-y-2">
          <p className="text-center font-semibold text-foreground text-sm">
            How do you want to login?
          </p>
          <div className="space-y-3 mt-4">
            {roles.map((r, i) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedRole(r.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all duration-200 text-left"
              >
                <div className={`w-12 h-12 rounded-xl ${r.color} flex items-center justify-center flex-shrink-0`}>
                  <r.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
