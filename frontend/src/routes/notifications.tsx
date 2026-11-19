import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { IndianRupee, Wrench, BedDouble, AlertTriangle, Check, Bell } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { useHostel } from "@/lib/hostelContext";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HostelDesk" }, { name: "description", content: "Rent reminders, expense alerts and room availability updates." }] }),
  component: NotificationsPage,
});

type N = { id: string; type: "rent" | "maintenance" | "room" | "expense"; title: string; desc: string; time: string; read: boolean };

const seed: N[] = [];

const typeMeta = {
  rent: { icon: IndianRupee, tone: "bg-amber-500/10 text-[#D97706] border border-amber-500/20" },
  maintenance: { icon: Wrench, tone: "bg-blue-500/10 text-[#2563EB] border border-blue-500/20" },
  room: { icon: BedDouble, tone: "bg-emerald-500/10 text-[#16A34A] border border-emerald-500/20" },
  expense: { icon: AlertTriangle, tone: "bg-red-500/10 text-[#DC2626] border border-red-500/20" },
} as const;

function NotificationsPage() {
  const { activeHostel, isPortfolioView } = useHostel();
  const [items, setItems] = useState<N[]>(seed);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const filtered = tab === "unread" ? items.filter((i) => !i.read) : items;
  const unread = items.filter((i) => !i.read).length;

  const markAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    toast.success("All notifications marked as read");
  };
  const toggle = (id: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, read: true } : i)));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <SectionHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread updates (${isPortfolioView ? "All Hostels" : activeHostel?.name})` : "You're all caught up"}
        action={
          unread > 0 ? (
            <button onClick={markAll} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors">
              <Check size={14} /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
              tab === t
                ? "bg-[#0B0B0B] text-white dark:bg-[#EEFF2E] dark:text-[#0B0B0B] shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} {t === "unread" && unread > 0 && <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-[#EEFF2E] text-[#0B0B0B] font-bold">({unread})</span>}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 opacity-30" size={36} />
            <p className="text-sm font-medium text-foreground">Nothing here</p>
            <p className="text-xs text-muted-foreground mt-0.5">No new notifications to display</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((n) => {
              const meta = typeMeta[n.type];
              const Icon = meta.icon;
              return (
                <button key={n.id} onClick={() => toggle(n.id)} className="w-full text-left flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                      {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-[#EEFF2E] border border-[#0B0B0B] mt-1 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{n.time}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-semibold text-foreground mb-1">Notification preferences</h3>
        <p className="text-xs text-muted-foreground mb-4">Choose what you want to be notified about</p>
        <div className="space-y-1">
          {[
            { k: "Rent reminders", v: true },
            { k: "Maintenance updates", v: true },
            { k: "New room enquiries", v: true },
            { k: "Expense alerts", v: false },
          ].map((p) => (
            <Toggle key={p.k} label={p.k} initial={p.v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, initial }: { label: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button
      onClick={() => { setOn(!on); toast(`${label} ${!on ? "enabled" : "disabled"}`); }}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={`relative w-11 h-6 rounded-full transition-colors ${on ? "bg-[#0B0B0B] dark:bg-[#EEFF2E]" : "bg-muted border border-border"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full ${on ? "bg-white dark:bg-[#0B0B0B]" : "bg-card shadow-sm"} transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}
