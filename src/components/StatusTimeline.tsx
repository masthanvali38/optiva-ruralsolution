import { CheckCircle2, Circle } from "lucide-react";

const steps = [
  { key: "reported", label: "Reported" },
  { key: "accepted", label: "Accepted" },
  { key: "on_the_way", label: "On the Way" },
  { key: "work_in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "verified", label: "Verified" },
];

const statusOrder = steps.map((s) => s.key);

export default function StatusTimeline({ status }: { status: string }) {
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-4 h-0.5 ${done ? "bg-primary" : "bg-border"}`} />
            )}
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={`text-[9px] mt-0.5 whitespace-nowrap ${done ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
