import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "success" | "warning" | "info" | "accent";

const toneClasses: Record<Tone, string> = {
  primary: "bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B]",
  success: "bg-emerald-500/10 text-[#16A34A] border border-emerald-500/20",
  warning: "bg-amber-500/10 text-[#D97706] border border-amber-500/20",
  info: "bg-blue-500/10 text-[#2563EB] border border-blue-500/20",
  accent: "bg-[#EEFF2E]/20 text-[#0B0B0B] dark:text-[#EEFF2E] border border-[#EEFF2E]/30",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  trend?: { value: string; up: boolean };
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-foreground/20 transition-all">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${toneClasses[tone]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              trend.up
                ? "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20"
                : "bg-red-500/10 text-[#DC2626] border-red-500/20"
            }`}
          >
            {trend.up ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="mt-1 font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
