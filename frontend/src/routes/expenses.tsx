import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Filter, Zap, Wrench, Users, ShoppingCart, MoreHorizontal, X, Check } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { toast } from "sonner";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { type Expense, formatINR } from "@/lib/mockData";
import { useHostel } from "@/lib/hostelContext";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — HostelDesk" }, { name: "description", content: "Track and analyse PG expenses by category." }] }),
  component: ExpensesPage,
});

const catIcon = { Utilities: Zap, Maintenance: Wrench, Salaries: Users, Groceries: ShoppingCart, Other: MoreHorizontal } as const;
const catColor: Record<Expense["category"], string> = {
  Utilities: "var(--color-chart-3)",
  Maintenance: "var(--color-chart-4)",
  Salaries: "var(--color-chart-1)",
  Groceries: "var(--color-chart-2)",
  Other: "var(--color-chart-5)",
};

function ExpensesPage() {
  const { expenses: items, addExpense, activeHostel, isPortfolioView } = useHostel();
  const [filter, setFilter] = useState<Expense["category"] | "all">("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => (filter === "all" ? items : items.filter((e) => e.category === filter)), [items, filter]);
  const total = items.reduce((s, e) => s + e.amount, 0);
  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((e) => (map[e.category] = (map[e.category] ?? 0) + e.amount));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((e) => {
      const k = new Date(e.date).toLocaleDateString("en-IN", { month: "short" });
      map[k] = (map[k] ?? 0) + e.amount;
    });
    return Object.entries(map).map(([month, amount]) => ({ month, amount })).reverse();
  }, [items]);

  const add = (e: Expense) => {
    addExpense(e);
    toast.success("Expense added", { description: `${e.category} • ${formatINR(e.amount)}` });
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Expenses"
        subtitle={`Total tracked ${formatINR(total)} (${isPortfolioView ? "All Hostels" : activeHostel?.name})`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EEFF2E] px-4 py-2.5 text-sm font-semibold text-[#0B0B0B] hover:brightness-95 active:scale-[0.98] transition shadow-sm"
          >
            <Plus size={16} /> Add expense
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Monthly trend</h3>
          <div className="h-64 -ml-2">
            <ResponsiveContainer>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#0B0B0B" }}
                  formatter={(v: number) => [formatINR(v), "Expenses"]}
                />
                <Bar dataKey="amount" fill="#0B0B0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">By category</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {byCat.map((c) => <Cell key={c.name} fill={catColor[c.name as Expense["category"]]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatINR(v), "Total"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#0B0B0B" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 items-center justify-between border-b border-border bg-card">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Filter size={14} /> Filter Category
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "Utilities", "Maintenance", "Salaries", "Groceries", "Other"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filter === c
                    ? "bg-[#0B0B0B] text-white dark:bg-[#EEFF2E] dark:text-[#0B0B0B] shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((e) => {
            const Icon = catIcon[e.category];
            return (
              <div key={e.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${catColor[e.category]}15`, color: catColor[e.category] }}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{e.note}</p>
                  <p className="text-xs text-muted-foreground">{e.category} • {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <p className="font-semibold text-sm text-foreground whitespace-nowrap">{formatINR(e.amount)}</p>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No expenses match this filter</p>}
        </div>
      </div>

      {open && <ExpenseModal onClose={() => setOpen(false)} onSave={add} />}
    </div>
  );
}

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Expense) => void }) {
  const { activeHostel } = useHostel();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [form, setForm] = useState<Expense>({
    id: crypto.randomUUID(),
    hostelId: activeHostel?.id || "",
    date: new Date().toISOString().slice(0, 10),
    category: "Utilities",
    amount: 0,
    note: "",
  });

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div>
            <h3 className="text-base font-semibold leading-none text-foreground">Add Expense</h3>
            <p className="text-xs text-muted-foreground mt-1">Record property bills, maintenance, or operational costs</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={(e) => { e.preventDefault(); if (form.amount > 0) onSave(form); }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(Object.keys(catIcon) as Expense["category"][]).map((c) => {
                  const Icon = catIcon[c];
                  const active = form.category === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm({ ...form, category: c })}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all border ${
                        active
                          ? "bg-[#0B0B0B] text-white border-[#0B0B0B] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] dark:border-[#EEFF2E] shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon size={16} /> {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (₹) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: +e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Note / Description</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                placeholder="e.g. Electricity bill May"
              />
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="px-6 py-4 border-t border-border shrink-0 bg-card flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] text-sm font-semibold hover:brightness-95 active:scale-[0.98] shadow-sm transition-all"
            >
              <Check size={16} /> Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
