import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BedDouble,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Wrench,
  IndianRupee,
  Building2,
  MapPin,
  Layers,
  Plus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { StatCard } from "@/components/ui-kit/StatCard";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { formatINR } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import { useHostel } from "@/lib/hostelContext";
import { AddHostelDialog } from "@/components/dialogs/AddHostelDialog";
import { getTenantCycleInfo } from "@/lib/rentCycle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — HostelDesk" },
      { name: "description", content: "Occupancy, revenue and multi-hostel portfolio overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const {
    hostels,
    activeHostel,
    isPortfolioView,
    rooms,
    allRooms,
    tenants,
    allTenants,
    payments,
    expenses,
    setActiveHostelId,
  } = useHostel();

  const [showAddHostel, setShowAddHostel] = useState(false);
  const firstName = user?.name?.split(" ")[0] ?? "Owner";

  // Scoped calculation
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupied = rooms.reduce((s, r) => s + r.occupied, 0);
  const available = Math.max(0, totalCapacity - occupied);
  const occupancyPct = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;
  
  const monthlyRev = payments.reduce((s, p) => s + p.amount, 0);
  const monthlyExp = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingTenants = tenants.filter((t) => {
    if (t.status !== "active") return false;
    const cycle = getTenantCycleInfo(t);
    return !cycle.isCurrentCyclePaid || cycle.isNextCycleDue;
  });
  const pendingAmount = pendingTenants.reduce((s, t) => {
    const cycle = getTenantCycleInfo(t);
    return s + cycle.pendingAmount;
  }, 0);

  // Dynamic 6-month revenue & expense chart data
  const revenueChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result: { month: string; monthIndex: number; year: number; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        month: months[d.getMonth()],
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        revenue: 0,
        expenses: 0,
      });
    }

    payments.forEach((p) => {
      const pd = new Date(p.date);
      const b = result.find((item) => item.monthIndex === pd.getMonth() && item.year === pd.getFullYear());
      if (b) b.revenue += p.amount;
    });

    expenses.forEach((e) => {
      const ed = new Date(e.date);
      const b = result.find((item) => item.monthIndex === ed.getMonth() && item.year === ed.getFullYear());
      if (b) b.expenses += e.amount;
    });

    return result;
  }, [payments, expenses]);

  // Floor occupancy data calculation
  const floorData = (() => {
    const floors: Record<number, { occupied: number; available: number }> = {};
    rooms.forEach((r) => {
      if (!floors[r.floor]) floors[r.floor] = { occupied: 0, available: 0 };
      floors[r.floor].occupied += r.occupied;
      floors[r.floor].available += Math.max(0, r.capacity - r.occupied);
    });
    return Object.entries(floors).map(([floor, v]) => ({ floor: `Floor ${floor}`, ...v }));
  })();

  const currentMonth = new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Onboarding Guide Card when no branches exist */}
      {hostels.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center mx-auto mb-3.5 font-bold shadow-sm">
              <Building2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-foreground">Welcome to your Hostel PMS!</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-lg mx-auto leading-relaxed">
              To start managing your property, follow the 3 sequential steps below:
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="rounded-xl bg-background border-2 border-[#0B0B0B] dark:border-[#EEFF2E] p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EEFF2E] text-[#0B0B0B]">
                  Step 1 • Action Needed
                </span>
                <p className="font-bold text-xs mt-2.5 text-foreground">Create Hostel Branch</p>
                <p className="text-[11px] text-muted-foreground mt-1">Register branch name, PG type, city, and address.</p>
              </div>

              <div className="rounded-xl bg-muted/40 border border-border p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Step 2 • Next
                </span>
                <p className="font-semibold text-xs mt-2.5 text-foreground">Add Rooms & Beds</p>
                <p className="text-[11px] text-muted-foreground mt-1">Configure Single, Double, Triple sharing and monthly rents.</p>
              </div>

              <div className="rounded-xl bg-muted/40 border border-border p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Step 3 • Next
                </span>
                <p className="font-semibold text-xs mt-2.5 text-foreground">Assign Residents</p>
                <p className="text-[11px] text-muted-foreground mt-1">Select from available beds & verify Aadhaar documents.</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddHostel(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] font-semibold px-6 py-3 text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition-all"
            >
              <Plus size={16} /> Add New Hostel Branch
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner - Midnight Black & Highlighter Yellow Theme */}
      <div className="rounded-2xl bg-[#0B0B0B] text-white p-6 lg:p-8 border border-[#1F1F1F] shadow-md relative overflow-hidden">
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-[#9CA3AF] font-medium">Good morning, {firstName}</p>
            {isPortfolioView ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#262626] text-xs font-medium text-white">
                <Layers size={13} className="text-[#EEFF2E]" /> Consolidated Portfolio ({hostels.length} Branches)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#262626] text-xs font-medium text-white">
                <Building2 size={13} className="text-[#EEFF2E]" /> {activeHostel?.city ?? "All Cities"} • {activeHostel?.type ?? "Standard"} PG
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl lg:text-3xl font-bold mt-2 text-white">
            {isPortfolioView
              ? `Overall Portfolio Performance (${hostels.length} Branches)`
              : `Here's how ${activeHostel?.name ?? "your hostel"} is doing today`}
          </h1>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <HeroStat label="Occupancy" value={`${occupancyPct}%`} hint={`${occupied}/${totalCapacity} beds`} highlight={occupancyPct > 0} />
            <HeroStat label="Revenue (Mo)" value={formatINR(monthlyRev)} hint={currentMonth} highlight={monthlyRev > 0} />
            <HeroStat label="Pending Dues" value={formatINR(pendingAmount)} hint={`${pendingTenants.length} tenants`} />
            <HeroStat label="Expenses (Mo)" value={formatINR(monthlyExp)} hint={currentMonth} />
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available beds"
          value={String(available)}
          icon={BedDouble}
          tone="success"
          hint={`out of ${totalCapacity}`}
        />
        <StatCard
          label="Occupied beds"
          value={String(occupied)}
          icon={Users}
          tone="primary"
          trend={{ value: "8%", up: true }}
        />
        <StatCard
          label="Active tenants"
          value={String(tenants.filter((t) => t.status === "active").length)}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Net profit"
          value={formatINR(monthlyRev - monthlyExp)}
          icon={TrendingUp}
          tone="accent"
          trend={{ value: "12%", up: true }}
        />
      </div>

      {/* Multi-Hostel Portfolio Comparison Grid (Shown when Portfolio View is Active) */}
      {isPortfolioView && (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <SectionHeader
            title="Branch-by-Branch Performance"
            subtitle={`Comparing ${hostels.length} active hostel properties in your portfolio`}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {hostels.length === 0 ? (
              <div className="md:col-span-3 p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                <Building2 className="mx-auto mb-2 opacity-40" size={28} />
                <p className="text-sm font-medium">No hostel properties yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add your first branch to compare performance</p>
              </div>
            ) : (
              hostels.map((h) => {
                const branchRooms = allRooms.filter((r) => r.hostelId === h.id);
                const branchTenants = allTenants.filter((t) => t.hostelId === h.id && t.status === "active");
                const bCapacity = branchRooms.reduce((acc, r) => acc + r.capacity, 0);
                const bOccupied = branchRooms.reduce((acc, r) => acc + r.occupied, 0);
                const bOccPct = bCapacity > 0 ? Math.round((bOccupied / bCapacity) * 100) : 0;

                return (
                  <div
                    key={h.id}
                    className="rounded-xl border border-border p-4 bg-background/50 hover:border-foreground/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            h.type === "Boys"
                              ? "bg-blue-500/10 text-[#2563EB] border-blue-500/20"
                              : h.type === "Girls"
                              ? "bg-pink-500/10 text-pink-600 border-pink-500/20"
                              : "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20"
                          }`}
                        >
                          {h.type} PG
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{h.code}</span>
                      </div>

                      <h3 className="font-display font-semibold text-base mt-2 text-foreground">{h.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {h.city}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Occupancy</span>
                          <span className="font-semibold text-foreground">{bOccPct}% ({bOccupied}/{bCapacity} beds)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#0B0B0B] dark:bg-[#EEFF2E] h-full rounded-full transition-all"
                            style={{ width: `${bOccPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-muted-foreground">Active Tenants</span>
                          <span className="font-semibold text-foreground">{branchTenants.length}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveHostelId(h.id)}
                      className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-semibold border border-border bg-card text-foreground hover:bg-[#EEFF2E] hover:text-[#0B0B0B] hover:border-[#EEFF2E] transition-all text-center"
                    >
                      Manage {h.name.split(" ")[0]} Branch →
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-foreground">Revenue vs Expenses</h2>
              <p className="text-xs text-muted-foreground">Last 6 months performance</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground font-semibold">Monthly</span>
          </div>
          <div className="h-64 -ml-2">
            <ResponsiveContainer>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B0B0B" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0B0B0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6B7280" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6B7280" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }}
                  formatter={(v: number) => formatINR(v)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0B0B0B" strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" stroke="#6B7280" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">Occupancy by floor</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={floorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="floor" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }} />
                <Bar dataKey="occupied" stackId="a" fill="#0B0B0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="available" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts and Recent Payments */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5">
          <SectionHeader
            title="Alerts & reminders"
            subtitle="Items needing your attention"
            action={
              <Link to="/notifications" className="text-xs font-semibold text-foreground inline-flex items-center gap-1 hover:text-[#D97706] transition-colors">
                View all <ArrowUpRight size={14} />
              </Link>
            }
          />
          <div className="space-y-2">
            {pendingTenants.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm font-medium">No pending dues or alerts</p>
                <p className="text-xs text-muted-foreground mt-1">Everything is up to date</p>
              </div>
            ) : (
              pendingTenants.slice(0, 3).map((t) => (
                <AlertRow
                  key={t.id}
                  icon={IndianRupee}
                  tone="warning"
                  title={`Rent pending — ${t.name}`}
                  desc={`Room ${t.roomNumber} • Due ${new Date(t.rentDue).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}`}
                  amount={formatINR(t.rentAmount)}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5">
          <h2 className="font-display font-semibold text-foreground mb-4">Recent payments</h2>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm font-medium">No payments recorded</p>
                <p className="text-xs text-muted-foreground mt-1">New collections will appear here</p>
              </div>
            ) : (
              payments.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0B0B0B] text-[#EEFF2E] font-bold text-xs flex items-center justify-center shrink-0">
                    {p.tenantName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.tenantName}</p>
                    <p className="text-xs text-muted-foreground">Room {p.roomNumber} • {p.method}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#16A34A]">+{formatINR(p.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddHostelDialog open={showAddHostel} onClose={() => setShowAddHostel(false)} />
    </div>
  );
}

function HeroStat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#141414] border border-[#222222] p-3.5 lg:p-4 min-w-0 transition-all hover:border-[#333333]">
      <p className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium truncate" title={label}>
        {label}
      </p>
      <p className={`font-display text-xl lg:text-2xl font-bold mt-1 truncate ${highlight ? "text-[#EEFF2E]" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs text-[#6B7280] mt-0.5 truncate">{hint}</p>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  tone,
  title,
  desc,
  amount,
}: {
  icon: any;
  tone: "warning" | "info" | "destructive";
  title: string;
  desc: string;
  amount: string;
}) {
  const tones = {
    warning: "bg-amber-500/10 text-[#D97706] border border-amber-500/20",
    info: "bg-blue-500/10 text-[#2563EB] border border-blue-500/20",
    destructive: "bg-red-500/10 text-[#DC2626] border border-red-500/20",
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <p className="text-sm font-semibold text-foreground whitespace-nowrap">{amount}</p>
    </div>
  );
}
