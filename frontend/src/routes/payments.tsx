import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Banknote, Smartphone, Building2, X, Check, Download, Printer } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { type Payment, formatINR } from "@/lib/mockData";
import { useHostel } from "@/lib/hostelContext";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments — HostelDesk" }, { name: "description", content: "Record rent payments and view revenue analytics." }] }),
  component: PaymentsPage,
});

const methodIcon = { Cash: Banknote, UPI: Smartphone, "Bank Transfer": Building2 } as const;

function PaymentsPage() {
  const { payments: items, addPayment, activeHostel, isPortfolioView, tenants } = useHostel();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [range, setRange] = useState<"3m" | "6m" | "12m">("6m");

  const total = items.reduce((s, p) => s + p.amount, 0);
  const byMethod = useMemo(() => {
    const map: Record<string, number> = { Cash: 0, UPI: 0, "Bank Transfer": 0 };
    items.forEach((p) => (map[p.method] += p.amount));
    return map;
  }, [items]);

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const count = range === "3m" ? 3 : range === "12m" ? 12 : 6;
    const now = new Date();
    const list: { month: string; monthIndex: number; year: number; revenue: number }[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        month: months[d.getMonth()],
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        revenue: 0,
      });
    }
    items.forEach((p) => {
      const pd = new Date(p.date);
      const bucket = list.find((b) => b.monthIndex === pd.getMonth() && b.year === pd.getFullYear());
      if (bucket) bucket.revenue += p.amount;
    });
    return list;
  }, [items, range]);

  const record = (p: Payment) => {
    addPayment(p);
    toast.success("Payment recorded", { description: `${p.tenantName} • ${formatINR(p.amount)}` });
    setOpen(false);
    setReceipt(p);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Payments & revenue"
        subtitle={`${formatINR(total)} collected this cycle (${isPortfolioView ? "All Hostels" : activeHostel?.name})`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EEFF2E] px-4 py-2.5 text-sm font-semibold text-[#0B0B0B] hover:brightness-95 active:scale-[0.98] transition shadow-sm"
          >
            <Plus size={16} /> Record payment
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.keys(methodIcon) as Payment["method"][]).map((m) => {
          const Icon = methodIcon[m];
          return (
            <div key={m} className="rounded-2xl bg-card border border-border p-5 hover:border-[#0B0B0B]/30 dark:hover:border-[#EEFF2E]/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center font-bold">
                  <Icon size={18} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{items.filter(i => i.method === m).length} txns</span>
              </div>
              <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mt-4">{m}</p>
              <p className="font-bold text-2xl tracking-tight text-foreground mt-1">{formatINR(byMethod[m])}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-foreground">Revenue trend</h3>
            <p className="text-xs text-muted-foreground">Track your monthly collections</p>
          </div>
          <div className="flex bg-muted rounded-xl p-1 border border-border">
            {(["3m", "6m", "12m"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  range === r
                    ? "bg-[#0B0B0B] text-white dark:bg-[#EEFF2E] dark:text-[#0B0B0B] shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72 -ml-2">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B0B0B" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0B0B0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#0B0B0B" }}
                formatter={(v: number) => [formatINR(v), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0B0B0B" strokeWidth={2.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-card">
          <h3 className="font-semibold text-foreground text-sm">Recent payments</h3>
        </div>
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm font-medium">No payments recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">Record a payment to track collections</p>
            </div>
          ) : (
            items.map((p) => {
              const Icon = methodIcon[p.method];
              const isRefund = p.type === "Advance Refund";
              const isAdvance = p.type === "Advance";

              return (
                <div key={p.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isRefund
                      ? "bg-amber-500/10 text-[#D97706] border-amber-500/20"
                      : isAdvance
                      ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                      : "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20"
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{p.tenantName}</p>
                      {p.type && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isRefund
                            ? "bg-amber-500/10 text-[#D97706] border-amber-500/20"
                            : isAdvance
                            ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                            : "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20"
                        }`}>
                          {p.type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Room {p.roomNumber} • {p.method} • {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {p.notes ? ` • ${p.notes}` : ""}
                    </p>
                  </div>
                  <p className={`font-semibold whitespace-nowrap text-sm ${
                    isRefund ? "text-[#DC2626]" : isAdvance ? "text-indigo-600 dark:text-indigo-400" : "text-[#16A34A]"
                  }`}>
                    {isRefund ? `-${formatINR(p.amount)}` : `+${formatINR(p.amount)}`}
                  </p>
                  <button onClick={() => setReceipt(p)} className="ml-3 text-xs font-semibold text-foreground hover:underline hidden sm:inline px-2.5 py-1 rounded-lg border border-border bg-card">
                    Receipt
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {open && <PaymentModal onClose={() => setOpen(false)} onSave={record} />}
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function PaymentModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Payment) => void }) {
  const { activeHostel, tenants } = useHostel();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const defaultTenant = tenants[0] || { name: "", roomNumber: "", rentAmount: 0 };
  const [form, setForm] = useState<Payment>({
    id: `P-${Date.now()}`,
    hostelId: activeHostel?.id || "",
    tenantName: defaultTenant.name,
    roomNumber: defaultTenant.roomNumber,
    amount: defaultTenant.rentAmount,
    method: "UPI",
    date: new Date().toISOString().slice(0, 10),
    type: "Rent",
  });

  const setTenant = (name: string) => {
    const t = tenants.find((x) => x.name === name);
    if (t) {
      setForm({ ...form, tenantName: t.name, roomNumber: t.roomNumber, amount: t.rentAmount });
    }
  };

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
            <h3 className="text-base font-semibold leading-none text-foreground">Record Payment</h3>
            <p className="text-xs text-muted-foreground mt-1">Log tenant rent or fee collection</p>
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
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Tenant</label>
              <select
                value={form.tenantName}
                onChange={(e) => setTenant(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
              >
                {tenants.filter(t => t.status === "active").map((t) => (
                  <option key={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Payment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Rent", "Advance", "Advance Refund"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.type === t
                        ? "bg-[#0B0B0B] text-white border-[#0B0B0B] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] dark:border-[#EEFF2E] shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (₹) *</label>
              <input
                type="number"
                min={1}
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: +e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment Method</label>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(methodIcon) as Payment["method"][]).map((m) => {
                  const Icon = methodIcon[m];
                  const active = form.method === m;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setForm({ ...form, method: m })}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                        active
                          ? "bg-[#0B0B0B] text-white border-[#0B0B0B] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] dark:border-[#EEFF2E] shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon size={18} /> {m}
                    </button>
                  );
                })}
              </div>
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
              <Check size={16} /> Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function ReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { activeHostel } = useHostel();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card rounded-2xl w-full max-w-sm my-auto shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-[#0B0B0B] p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#EEFF2E] text-[#0B0B0B]">
              Payment Receipt
            </span>
            <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <p className="font-bold text-xl text-white mt-3">{activeHostel?.name ?? "HostelDesk PG"}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{activeHostel ? `${activeHostel.address}, ${activeHostel.city}` : "Main Branch"}</p>
        </div>
        <div className="p-6 space-y-3 text-xs overflow-y-auto flex-1">
          <Row k="Receipt #" v={payment.id} />
          <Row k="Date" v={new Date(payment.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          <Row k="Payment Type" v={payment.type || "Rent"} />
          <Row k="Tenant" v={payment.tenantName} />
          <Row k="Room" v={payment.roomNumber} />
          <Row k="Method" v={payment.method} />
          <div className="border-t border-dashed border-border pt-3 mt-3">
            <Row k="Amount Paid" v={formatINR(payment.amount)} bold />
          </div>
        </div>
        <div className="p-4 border-t border-border shrink-0 bg-card flex gap-2">
          <button
            onClick={() => toast.success("Receipt downloaded")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] py-2 text-xs font-semibold hover:brightness-95 transition-all shadow-sm"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-display text-lg font-bold" : "font-medium"}>{v}</span>
    </div>
  );
}
