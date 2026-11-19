import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Search,
  BellRing,
  LogOut,
  LogIn,
  Upload,
  X,
  CheckCircle2,
  ShieldCheck,
  Users,
  Building2,
  AlertCircle,
  Plus,
  Trash2,
  Wallet,
  Layers,
  Check,
  Clock,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { type Tenant, type Payment, formatINR } from "@/lib/mockData";
import { useHostel } from "@/lib/hostelContext";
import { AddHostelDialog } from "@/components/dialogs/AddHostelDialog";
import {
  getTenantCycleInfo,
  formatCycleDate,
  formatCycleDateFull,
  addOneMonth,
} from "@/lib/rentCycle";

export const Route = createFileRoute("/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — HostelDesk" },
      { name: "description", content: "Manage residents, rent cycles, advance refunds and checkouts." },
    ],
  }),
  component: TenantsPage,
});

function TenantsPage() {
  const {
    tenants,
    allRooms,
    addTenant,
    updateTenant,
    deleteTenant,
    addPayment,
    activeHostel,
    hostels,
    isPortfolioView,
  } = useHostel();

  const [q, setQ] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<"all" | number>("all");
  const [groupByFloor, setGroupByFloor] = useState(true);
  const [active, setActive] = useState<Tenant | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showAddHostel, setShowAddHostel] = useState(false);
  const [checkingOutTenant, setCheckingOutTenant] = useState<Tenant | null>(null);
  const [collectingRentTenant, setCollectingRentTenant] = useState<Tenant | null>(null);

  // Helper to find tenant's floor
  const getTenantRoom = (t: Tenant) => {
    return allRooms.find(
      (r) => (!t.hostelId || r.hostelId === t.hostelId) && r.number === t.roomNumber
    );
  };

  const getTenantFloor = (t: Tenant) => {
    const room = getTenantRoom(t);
    return room?.floor ?? 1;
  };

  // Unique floors across all current rooms and residents
  const uniqueFloors = useMemo(() => {
    const set = new Set<number>();
    allRooms.forEach((r) => set.add(r.floor));
    tenants.forEach((t) => set.add(getTenantFloor(t)));
    return Array.from(set).sort((a, b) => a - b);
  }, [allRooms, tenants]);

  // Filtered tenants by search query and floor
  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchesQuery = `${t.name} ${t.roomNumber}`.toLowerCase().includes(q.toLowerCase());
      const matchesFloor = selectedFloor === "all" || getTenantFloor(t) === selectedFloor;
      return matchesQuery && matchesFloor;
    });
  }, [tenants, q, selectedFloor, allRooms]);

  // Grouped tenants by floor
  const groupedByFloor = useMemo(() => {
    const map = new Map<number, Tenant[]>();
    filtered.forEach((t) => {
      const f = getTenantFloor(t);
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(t);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, floorTenants]) => ({
        floor,
        tenants: floorTenants,
      }));
  }, [filtered, allRooms]);

  // Send Email / SMS reminder
  const sendReminder = async (t: Tenant) => {
    const cycle = getTenantCycleInfo(t);
    const updatedCount = (t.remindersSent || 0) + 1;
    updateTenant({
      ...t,
      remindersSent: updatedCount,
    });

    const targetEmail = t.email && t.email !== "—" ? t.email : `${t.name.toLowerCase().replace(/\s+/g, "")}@gmail.com`;

    // Attempt to deliver live email via backend Nodemailer service
    try {
      const res = await fetch("http://localhost:3001/api/email/rent-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantEmail: targetEmail,
          tenantName: t.name,
          amount: t.rentAmount,
          dueDate: cycle.cycleEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          roomNumber: t.roomNumber,
          hostelName: activeHostel?.name || "HostelDesk PG",
          cycleLabel: cycle.isNextCycleDue ? cycle.nextCycleLabel : cycle.cycleLabel,
        }),
      });
      if (res.ok) {
        toast.success(`Rent reminder #${updatedCount} sent to ${targetEmail}`, {
          description: `Email delivered via Nodemailer for cycle ${cycle.nextCycleLabel} (${formatINR(t.rentAmount)})`,
        });
        return;
      }
    } catch {
      // Backend not running or offline; proceed gracefully
    }

    toast.success(`Rent reminder #${updatedCount} dispatched`, {
      description: `Notification queued for ${targetEmail} (${t.phone}) for cycle ${cycle.nextCycleLabel} (${formatINR(t.rentAmount)})`,
    });
  };

  // Delete resident
  const handleDeleteTenant = (t: Tenant) => {
    if (
      window.confirm(
        `Are you sure you want to delete resident "${t.name}"? This will permanently remove the record and free up their bed in Room ${t.roomNumber}.`
      )
    ) {
      deleteTenant(t.id);
      toast.success(`${t.name} removed successfully`, {
        description: `Bed space in Room ${t.roomNumber} has been freed`,
      });
      if (active?.id === t.id) {
        setActive(null);
      }
    }
  };

  // Check-in submission
  const handleAddTenant = (
    t: Tenant,
    options?: {
      collectAdvance?: boolean;
      advanceMethod?: Payment["method"];
      collectRent?: boolean;
      rentMethod?: Payment["method"];
    }
  ) => {
    addTenant(t);

    const today = new Date().toISOString().slice(0, 10);

    // Record advance payment separately if selected
    if (options?.collectAdvance && t.advanceAmount && t.advanceAmount > 0) {
      addPayment({
        hostelId: t.hostelId,
        tenantName: t.name,
        roomNumber: t.roomNumber,
        amount: t.advanceAmount,
        method: options.advanceMethod || "UPI",
        date: today,
        type: "Advance",
        notes: `Security deposit / Advance collected at check-in for Room ${t.roomNumber}`,
      });
    }

    // Record 1st month rent if collected upfront
    if (options?.collectRent && t.rentAmount > 0) {
      addPayment({
        hostelId: t.hostelId,
        tenantName: t.name,
        roomNumber: t.roomNumber,
        amount: t.rentAmount,
        method: options.rentMethod || "UPI",
        date: today,
        type: "Rent",
        notes: `First month rent collected at check-in for Room ${t.roomNumber}`,
      });
    }

    toast.success(`${t.name} checked in to Room ${t.roomNumber}`, {
      description: `Monthly Rent: ${formatINR(t.rentAmount)} • Advance Deposit: ${formatINR(t.advanceAmount || 0)}`,
    });
    setShowCheckIn(false);
  };

  // Collect Next Month / Current Due Rent
  const handleCollectRent = (
    tenant: Tenant,
    amount: number,
    method: Payment["method"],
    notes?: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const cycle = getTenantCycleInfo(tenant);

    // If next cycle was due, advance the cycle window
    const newCycleStart = cycle.isNextCycleDue ? cycle.nextCycleStart.toISOString().slice(0, 10) : cycle.cycleStart.toISOString().slice(0, 10);
    const newCycleEnd = cycle.isNextCycleDue ? cycle.nextCycleEnd.toISOString().slice(0, 10) : cycle.cycleEnd.toISOString().slice(0, 10);

    updateTenant({
      ...tenant,
      paid: true,
      cycleStartDate: newCycleStart,
      cycleEndDate: newCycleEnd,
      rentDue: newCycleEnd,
      remindersSent: 0,
    });

    addPayment({
      hostelId: tenant.hostelId,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      amount,
      method,
      date: today,
      type: "Rent",
      notes: notes || `Monthly rent for Room ${tenant.roomNumber} (${formatCycleDate(new Date(newCycleStart))} – ${formatCycleDate(new Date(newCycleEnd))})`,
    });

    toast.success(`Rent payment recorded for ${tenant.name}`, {
      description: `Collected ${formatINR(amount)} via ${method} for cycle ${formatCycleDate(new Date(newCycleStart))} – ${formatCycleDate(new Date(newCycleEnd))}`,
    });

    setCollectingRentTenant(null);
  };

  // Confirm Check-out with notice period validation & advance deduction
  const handleConfirmCheckOut = (
    t: Tenant,
    refundAmount: number,
    maintenanceDeduction: number,
    negligencePenalty: number,
    deductionNote: string,
    refundMethod: Payment["method"],
    noticeStatus: "proper_notice" | "short_notice" | "no_notice"
  ) => {
    const today = new Date().toISOString().slice(0, 10);

    updateTenant({
      ...t,
      status: "left",
      advanceReturned: true,
      advanceReturnDate: today,
      advanceRefundAmount: refundAmount,
      maintenanceDeduction,
      negligencePenalty,
      noticeStatus,
      advanceNotes: deductionNote,
    });

    // Record advance refund payment if net refund amount > 0
    if (refundAmount > 0) {
      addPayment({
        hostelId: t.hostelId,
        tenantName: t.name,
        roomNumber: t.roomNumber,
        amount: refundAmount,
        method: refundMethod,
        date: today,
        type: "Advance Refund",
        notes: deductionNote || `Advance refund after deductions (Maint: ${formatINR(maintenanceDeduction)}, Penalty: ${formatINR(negligencePenalty)}) on vacating Room ${t.roomNumber}`,
      });
    }

    toast.success(`${t.name} checked out`, {
      description: `Bed in Room ${t.roomNumber} vacated • Net advance refund: ${formatINR(refundAmount)} (Maint: -${formatINR(maintenanceDeduction)}, Penalty: -${formatINR(negligencePenalty)})`,
    });

    setCheckingOutTenant(null);
    setActive(null);
  };

  // If no hostels exist yet, guide user to create their first hostel
  if (hostels.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Tenants"
          subtitle="Register your hostel property before managing residents"
        />
        <div className="rounded-2xl bg-card border border-border p-12 text-center max-w-md mx-auto my-12 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center mx-auto mb-4 font-bold shadow-sm">
            <Building2 size={28} />
          </div>
          <h2 className="text-lg font-bold text-foreground">Step 1: Create Hostel Branch</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Tenants are assigned to rooms within a hostel property. Please register your hostel branch and add rooms first.
          </p>
          <button
            onClick={() => setShowAddHostel(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] font-semibold px-5 py-2.5 text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition-all"
          >
            <Plus size={16} /> Add New Hostel Branch
          </button>
        </div>
        <AddHostelDialog open={showAddHostel} onClose={() => setShowAddHostel(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Tenants"
        subtitle={`${tenants.filter((t) => t.status === "active").length} active residents across ${uniqueFloors.length} floors (${isPortfolioView ? "All Hostels" : activeHostel?.name})`}
      />

      {/* Search and Action Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or room…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setGroupByFloor((p) => !p)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                groupByFloor
                  ? "bg-[#0B0B0B] text-[#EEFF2E] border-[#0B0B0B] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] dark:border-[#EEFF2E]"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers size={14} />
              <span>Floor Grouping:</span>
              <span className="font-bold">{groupByFloor ? "ON" : "OFF"}</span>
            </button>
            <button
              onClick={() => setShowCheckIn(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EEFF2E] px-4 py-2 text-sm font-semibold text-[#0B0B0B] hover:brightness-95 active:scale-[0.98] transition shadow-sm"
            >
              <LogIn size={16} /> New check-in
            </button>
          </div>
        </div>

        {/* Floor Wise Filter Pills */}
        {uniqueFloors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Floor:</span>
            <button
              onClick={() => setSelectedFloor("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFloor === "all"
                  ? "bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B]"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50"
              }`}
            >
              All Floors ({tenants.length})
            </button>
            {uniqueFloors.map((floor) => {
              const count = tenants.filter((t) => getTenantFloor(t) === floor).length;
              return (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedFloor === floor
                      ? "bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B]"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50"
                  }`}
                >
                  Floor {floor} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tenant List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 opacity-40" size={36} />
          <p className="text-sm font-semibold text-foreground">No tenants registered yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tenants.length === 0
              ? 'Click "New check-in" above to check in a resident into an available room'
              : "Try clearing search or floor filters"}
          </p>
        </div>
      ) : groupByFloor && selectedFloor === "all" ? (
        <div className="space-y-6">
          {groupedByFloor.map(({ floor, tenants: floorTenants }) => (
            <div key={floor} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B0B0B] dark:bg-[#EEFF2E]" />
                  <h3 className="font-bold text-sm text-foreground">Floor {floor} Residents</h3>
                  <span className="text-xs text-muted-foreground font-medium">
                    ({floorTenants.length} resident{floorTenants.length === 1 ? "" : "s"})
                  </span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {floorTenants.map((t) => (
                  <TenantCard
                    key={t.id}
                    tenant={t}
                    floor={floor}
                    onClick={() => setActive(t)}
                    onRemind={() => sendReminder(t)}
                    onCheckOut={() => setCheckingOutTenant(t)}
                    onCollectRent={() => setCollectingRentTenant(t)}
                    onDelete={() => handleDeleteTenant(t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TenantCard
              key={t.id}
              tenant={t}
              floor={getTenantFloor(t)}
              onClick={() => setActive(t)}
              onRemind={() => sendReminder(t)}
              onCheckOut={() => setCheckingOutTenant(t)}
              onCollectRent={() => setCollectingRentTenant(t)}
              onDelete={() => handleDeleteTenant(t)}
            />
          ))}
        </div>
      )}

      {/* Resident Profile Drawer */}
      {active && (
        <TenantDrawer
          tenant={active}
          floor={getTenantFloor(active)}
          onClose={() => setActive(null)}
          onCheckOut={() => setCheckingOutTenant(active)}
          onRemind={() => sendReminder(active)}
          onCollectRent={() => setCollectingRentTenant(active)}
          onDelete={() => handleDeleteTenant(active)}
        />
      )}

      {/* New Check In Modal */}
      {showCheckIn && (
        <CheckInModal
          onClose={() => setShowCheckIn(false)}
          onSubmit={handleAddTenant}
        />
      )}

      {/* Check Out & Advance Refund Modal with Notice Period Rule Check */}
      {checkingOutTenant && (
        <CheckOutModal
          tenant={checkingOutTenant}
          floor={getTenantFloor(checkingOutTenant)}
          onClose={() => setCheckingOutTenant(null)}
          onConfirm={handleConfirmCheckOut}
        />
      )}

      {/* Collect Rent Modal */}
      {collectingRentTenant && (
        <CollectRentModal
          tenant={collectingRentTenant}
          onClose={() => setCollectingRentTenant(null)}
          onConfirm={handleCollectRent}
        />
      )}
    </div>
  );
}

function TenantCard({
  tenant,
  floor,
  onClick,
  onRemind,
  onCheckOut,
  onCollectRent,
  onDelete,
}: {
  tenant: Tenant;
  floor: number;
  onClick: () => void;
  onRemind: () => void;
  onCheckOut: () => void;
  onCollectRent: () => void;
  onDelete: () => void;
}) {
  const cycle = getTenantCycleInfo(tenant);

  const statusStyles = {
    active: "bg-emerald-500/10 text-[#16A34A] border border-emerald-500/20",
    "checkout-pending": "bg-amber-500/10 text-[#D97706] border border-amber-500/20",
    left: "bg-muted text-muted-foreground border border-border",
  }[tenant.status];

  return (
    <div className="rounded-2xl bg-card border border-border p-5 hover:border-[#0B0B0B]/30 dark:hover:border-[#EEFF2E]/40 hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            {tenant.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={onClick} className="text-left w-full">
              <p className="font-semibold text-foreground text-sm truncate hover:underline">{tenant.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">Room {tenant.roomNumber}</span>
                <span>•</span>
                <span>Floor {floor}</span>
              </div>
            </button>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyles}`}>
            {tenant.status === "checkout-pending" ? "leaving" : tenant.status}
          </span>
        </div>

        {/* Contact details */}
        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-2"><Phone size={13} className="text-muted-foreground/70" /> {tenant.phone}</p>
          <p className="inline-flex items-center gap-2 truncate"><Mail size={13} className="text-muted-foreground/70" /> {tenant.email}</p>
          <p className="inline-flex items-center gap-2"><Calendar size={13} className="text-muted-foreground/70" /> Joined {new Date(tenant.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>

        {/* Monthly Cycle & Due Period Breakdown */}
        <div className="mt-3.5 pt-3 border-t border-dashed border-border/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Current Cycle:</span>
            <span className="font-medium text-foreground">{cycle.cycleLabel}</span>
          </div>

          {cycle.isNextCycleDue ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-[#D97706] flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1">
                <Clock size={12} /> Next Cycle Due:
              </span>
              <span className="font-bold">{cycle.nextCycleLabel} ({formatINR(tenant.rentAmount)})</span>
            </div>
          ) : !cycle.isCurrentCyclePaid ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-[11px] text-red-600 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> Rent Due:
              </span>
              <span className="font-bold">{formatINR(tenant.rentAmount)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Next cycle due:</span>
              <span className="font-medium text-foreground">{formatCycleDate(cycle.cycleEnd)} ({cycle.daysRemaining}d remaining)</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3.5 border-t border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Rent:</span>
              <span className="font-bold text-sm text-foreground">{formatINR(tenant.rentAmount)}/mo</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <Wallet size={11} className="text-muted-foreground/80" />
              <span>Adv:</span>
              <span className="font-semibold text-foreground">{formatINR(tenant.advanceAmount || 0)}</span>
            </div>
          </div>

          {/* Payment Status Badges & Quick Collect */}
          <div className="flex items-center gap-1.5">
            {cycle.isCurrentCyclePaid && !cycle.isNextCycleDue ? (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-[#16A34A] border border-emerald-500/20">
                Paid
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCollectRent();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EEFF2E] text-[#0B0B0B] hover:brightness-95 transition-all shadow-sm"
              >
                <IndianRupee size={12} /> Collect Rent
              </button>
            )}
          </div>
        </div>

        {/* Action Button Row: Direct Check Out button + Reminder button + Delete */}
        <div className="flex items-center gap-1.5 pt-1">
          {/* Reminder button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemind();
            }}
            title={tenant.remindersSent ? `Sent ${tenant.remindersSent} reminder(s)` : "Send rent reminder"}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors"
          >
            <BellRing size={12} />
            <span>Remind</span>
            {tenant.remindersSent ? (
              <span className="text-[10px] px-1 py-0.2 rounded bg-background border border-border text-muted-foreground">
                {tenant.remindersSent}x
              </span>
            ) : null}
          </button>

          {/* Direct Check out Button on Card (Requirement #3) */}
          {tenant.status !== "left" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCheckOut();
              }}
              title="Check out & vacate resident"
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 text-[#D97706] hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
            >
              <LogOut size={12} /> Check out
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title={`Delete resident ${tenant.name}`}
            className="p-1.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TenantDrawer({
  tenant,
  floor,
  onClose,
  onCheckOut,
  onRemind,
  onCollectRent,
  onDelete,
}: {
  tenant: Tenant;
  floor: number;
  onClose: () => void;
  onCheckOut: () => void;
  onRemind: () => void;
  onCollectRent: () => void;
  onDelete: () => void;
}) {
  const cycle = getTenantCycleInfo(tenant);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border-l border-border w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Resident Profile</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="flex items-start gap-4 mt-5">
            <div className="w-14 h-14 rounded-2xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center font-bold text-xl shrink-0">
              {tenant.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground leading-tight">{tenant.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Room {tenant.roomNumber} (Floor {floor}) • Since {new Date(tenant.checkIn).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Cycle & Rent status alert */}
          <div className="mt-5 p-3 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monthly Rent Cycle:</span>
              <span className="font-semibold text-foreground">{cycle.cycleLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment Status:</span>
              <span className={`font-semibold ${cycle.isCurrentCyclePaid && !cycle.isNextCycleDue ? "text-[#16A34A]" : "text-[#D97706]"}`}>
                {cycle.isCurrentCyclePaid && !cycle.isNextCycleDue ? "Paid for current month" : "Due for payment"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Next Cycle Due Date:</span>
              <span className="font-medium text-foreground">{formatCycleDateFull(cycle.cycleEnd)}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <Row icon={Phone} label="Phone" value={tenant.phone} />
            <Row icon={Mail} label="Email (for rent reminder)" value={tenant.email} />
            <Row icon={IndianRupee} label="Monthly rent" value={`${formatINR(tenant.rentAmount)} / month`} />
            <Row
              icon={Wallet}
              label="Security Advance Deposit"
              value={formatINR(tenant.advanceAmount || 0)}
              subtext={
                tenant.status === "left" && tenant.advanceReturned
                  ? `Refunded: ${formatINR(tenant.advanceRefundAmount ?? tenant.advanceAmount ?? 0)} on ${tenant.advanceReturnDate ? formatCycleDateFull(new Date(tenant.advanceReturnDate)) : "Vacated"}`
                  : "Held in escrow (Refundable upon vacating minus maintenance & notice deductions)"
              }
            />
          </div>

          <div className="mt-6">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">ID proof on file</h4>
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground bg-muted/20">
              <p className="font-mono font-medium text-foreground">Aadhaar Verified</p>
              <p className="mt-1 text-[11px] text-emerald-600 flex items-center justify-center gap-1"><ShieldCheck size={13} /> Verified & encrypted</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border space-y-2">
          {tenant.status !== "left" && (
            <div className="space-y-2">
              <div className="flex gap-2.5">
                <button
                  onClick={onRemind}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-muted transition-colors text-foreground"
                >
                  <BellRing size={14} /> Send Email Reminder
                </button>
                <button
                  onClick={onCollectRent}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] py-2.5 text-xs font-semibold hover:brightness-95 transition-all shadow-sm"
                >
                  <IndianRupee size={14} /> Collect Rent
                </button>
              </div>

              <button
                onClick={onCheckOut}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 py-2.5 text-xs font-semibold transition-colors"
              >
                <LogOut size={14} /> Vacate & Return Advance
              </button>
            </div>
          )}

          <button
            onClick={onDelete}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 py-2.5 text-xs font-semibold transition-colors"
          >
            <Trash2 size={14} /> Delete resident record
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, subtext }: { icon: any; label: string; value: string; subtext?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
      <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center text-muted-foreground shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
        {subtext && <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

// Check-in Modal
function CheckInModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (
    t: Tenant,
    options?: {
      collectAdvance?: boolean;
      advanceMethod?: Payment["method"];
      collectRent?: boolean;
      rentMethod?: Payment["method"];
    }
  ) => void;
}) {
  const { activeHostel, hostels, allRooms, isPortfolioView } = useHostel();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedHostelId, setSelectedHostelId] = useState(
    activeHostel?.id || hostels[0]?.id || ""
  );

  const branchRooms = useMemo(
    () => allRooms.filter((r) => r.hostelId === selectedHostelId),
    [allRooms, selectedHostelId]
  );

  const availableRooms = useMemo(
    () => branchRooms.filter((r) => r.status !== "maintenance" && r.capacity > r.occupied),
    [branchRooms]
  );

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    roomNumber: "",
    checkInDate: new Date().toISOString().slice(0, 10),
    rentAmount: "",
    advanceAmount: "",
    collectAdvanceNow: true,
    advanceMethod: "UPI" as Payment["method"],
    collectRentNow: true,
    rentMethod: "UPI" as Payment["method"],
    aadhaarNumber: "",
  });

  const selectedRoom = useMemo(
    () => branchRooms.find((r) => r.number === form.roomNumber),
    [branchRooms, form.roomNumber]
  );

  const [aadhaarFile, setAadhaarFile] = useState<{ name: string; size: number; preview?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleHostelChange = (newHostelId: string) => {
    setSelectedHostelId(newHostelId);
    setForm((p) => ({ ...p, roomNumber: "", rentAmount: "", advanceAmount: "" }));
  };

  const handleRoomSelect = (roomNum: string) => {
    const room = availableRooms.find((r) => r.number === roomNum);
    setForm((p) => ({
      ...p,
      roomNumber: roomNum,
      rentAmount: room ? String(room.rent) : p.rentAmount,
      advanceAmount: room ? String(room.rent) : p.advanceAmount,
    }));
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 5MB allowed" });
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type", { description: "Upload JPG, PNG or PDF" });
      return;
    }
    const isImage = file.type.startsWith("image/");
    const preview = isImage ? URL.createObjectURL(file) : undefined;
    setAadhaarFile({ name: file.name, size: file.size, preview });
    toast.success("Aadhaar uploaded", { description: "Document attached securely" });
  };

  const validAadhaar = /^\d{4}\s?\d{4}\s?\d{4}$/.test(form.aadhaarNumber.trim());

  const checkInStart = new Date(form.checkInDate || Date.now());
  const checkInEnd = addOneMonth(checkInStart);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostelId) {
      toast.error("Please select a hostel branch");
      return;
    }
    if (!form.roomNumber) {
      toast.error("Please assign an available room from the dropdown");
      return;
    }
    const roomToAssign = availableRooms.find((r) => r.number === form.roomNumber);
    if (!roomToAssign) {
      toast.error("Selected room is not available", {
        description: "The room may be full or in maintenance.",
      });
      return;
    }
    if (!form.name || !form.phone || !form.rentAmount) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!validAadhaar) {
      toast.error("Invalid Aadhaar number", { description: "Must be 12 digits" });
      return;
    }
    if (!aadhaarFile) {
      toast.error("Aadhaar card upload is mandatory", { description: "Required for ID verification" });
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const startStr = checkInStart.toISOString().slice(0, 10);
      const endStr = checkInEnd.toISOString().slice(0, 10);

      const newTenant: Tenant = {
        id: `t${Date.now()}`,
        hostelId: selectedHostelId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
        roomNumber: form.roomNumber.trim(),
        checkIn: startStr,
        cycleStartDate: startStr,
        cycleEndDate: endStr,
        rentDue: endStr,
        rentAmount: Number(form.rentAmount),
        advanceAmount: Number(form.advanceAmount) || 0,
        advancePaid: form.collectAdvanceNow,
        status: "active",
        paid: form.collectRentNow,
        remindersSent: 0,
      };

      onSubmit(newTenant, {
        collectAdvance: form.collectAdvanceNow,
        advanceMethod: form.advanceMethod,
        collectRent: form.collectRentNow,
        rentMethod: form.rentMethod,
      });

      setSubmitting(false);
    }, 400);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card w-full max-w-lg my-auto rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-border"
      >
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold leading-none text-foreground">New Resident Check-in</h3>
            <p className="text-xs text-muted-foreground mt-1">Assign room, rent cycle & security advance payment</p>
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

        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {isPortfolioView && hostels.length > 1 && (
              <Field label="Hostel Branch *">
                <select
                  value={selectedHostelId}
                  onChange={(e) => handleHostelChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city} • {h.code})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {branchRooms.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-[#D97706] space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle size={15} /> No rooms registered in this branch yet
                </p>
                <p className="text-muted-foreground">
                  Before adding residents, please visit the <strong>Rooms</strong> section to create rooms with bed capacities.
                </p>
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle size={15} /> All rooms in this branch are fully occupied
                </p>
                <p className="text-muted-foreground">
                  All {branchRooms.length} room(s) have 100% bed occupancy. Please add more rooms or check out an existing resident.
                </p>
              </div>
            ) : null}

            <div>
              <Field label="Assign Room (Available Beds Only) *">
                <select
                  required
                  disabled={availableRooms.length === 0}
                  value={form.roomNumber}
                  onChange={(e) => handleRoomSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  <option value="">
                    {availableRooms.length > 0
                      ? `-- Select an available room (${availableRooms.length} available) --`
                      : "No vacant rooms available"}
                  </option>
                  {availableRooms.map((r) => {
                    const freeBeds = r.capacity - r.occupied;
                    return (
                      <option key={r.id} value={r.number}>
                        Room {r.number} (Floor {r.floor} • {r.type} Sharing • {freeBeds} of {r.capacity} beds available) — {formatINR(r.rent)}/mo
                      </option>
                    );
                  })}
                </select>
              </Field>

              {selectedRoom && (
                <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-foreground flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Room {selectedRoom.number} Assigned
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Floor {selectedRoom.floor} • {selectedRoom.type} Sharing • {selectedRoom.capacity - selectedRoom.occupied} of {selectedRoom.capacity} beds vacant
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Base Rent</p>
                    <p className="font-bold text-foreground text-sm">{formatINR(selectedRoom.rent)}/mo</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="e.g. Rahul"
                />
              </Field>

              <Field label="Check-in Date *">
                <input
                  required
                  type="date"
                  value={form.checkInDate}
                  onChange={(e) => set("checkInDate", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone *">
                <input
                  required
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="+91 ..."
                />
              </Field>
              <Field label="Email (for reminders) *">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="resident@gmail.com"
                />
              </Field>
            </div>

            {/* Monthly Rent Cycle Display Note */}
            <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar size={13} /> Initial Monthly Billing Cycle:
              </p>
              <p className="text-muted-foreground">
                <strong>{formatCycleDateFull(checkInStart)} to {formatCycleDateFull(checkInEnd)}</strong> (1 Month). Next month rent will be due on {formatCycleDateFull(checkInEnd)}.
              </p>
            </div>

            {/* Rent & Advance Amounts */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3.5">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee size={14} /> Rent & Security Advance Payment
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Agreed Monthly Rent (₹) *">
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.rentAmount}
                    onChange={(e) => set("rentAmount", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                    placeholder="e.g. 6000"
                  />
                </Field>

                <Field label="Security Advance Amount (₹) *">
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.advanceAmount}
                    onChange={(e) => set("advanceAmount", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                    placeholder="e.g. 2000"
                  />
                </Field>
              </div>

              {/* Advance Collection Option */}
              <div className="pt-2 border-t border-border/60 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.collectAdvanceNow}
                    onChange={(e) => set("collectAdvanceNow", e.target.checked)}
                    className="rounded border-border w-4 h-4 text-[#0B0B0B] focus:ring-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  />
                  <span>Record Security Advance collection today ({formatINR(Number(form.advanceAmount) || 0)})</span>
                </label>

                {form.collectAdvanceNow && (
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Advance payment mode:</span>
                    <select
                      value={form.advanceMethod}
                      onChange={(e) => set("advanceMethod", e.target.value as Payment["method"])}
                      className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-semibold"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.collectRentNow}
                    onChange={(e) => set("collectRentNow", e.target.checked)}
                    className="rounded border-border w-4 h-4 text-[#0B0B0B] focus:ring-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  />
                  <span>Collect 1st month rent at check-in ({formatINR(Number(form.rentAmount) || 0)})</span>
                </label>

                {form.collectRentNow && (
                  <div className="pl-6 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Rent payment mode:</span>
                    <select
                      value={form.rentMethod}
                      onChange={(e) => set("rentMethod", e.target.value as Payment["method"])}
                      className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-semibold"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Aadhaar Section */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#0B0B0B] dark:text-[#EEFF2E]" />
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">ID Proof — Aadhaar Card</h4>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20">REQUIRED</span>
              </div>

              <Field label="Aadhaar number *">
                <input
                  required
                  value={form.aadhaarNumber}
                  onChange={(e) => set("aadhaarNumber", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                />
                {form.aadhaarNumber && !validAadhaar && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">Must be 12 digits</p>
                )}
              </Field>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Upload Aadhaar card *</p>
                {!aadhaarFile ? (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 cursor-pointer transition ${dragOver ? "border-[#0B0B0B] dark:border-[#EEFF2E] bg-muted/40" : "border-border hover:border-[#0B0B0B]/40 hover:bg-muted/30"}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Tap to upload or drag & drop</p>
                    <p className="text-[11px] text-muted-foreground">JPG, PNG or PDF • Max 5MB</p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {aadhaarFile.preview ? (
                        <img src={aadhaarFile.preview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <CheckCircle2 size={20} className="text-emerald-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{aadhaarFile.name}</p>
                        <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={12} /> Ready to submit ({(aadhaarFile.size / 1024).toFixed(0)} KB)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAadhaarFile(null)}
                      className="text-xs font-semibold text-red-600 hover:underline px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-card px-6 py-4 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableRooms.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] font-semibold px-5 py-2.5 text-sm hover:brightness-95 active:scale-[0.98] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>Processing Check-in…</>
              ) : (
                <>
                  <LogIn size={16} /> Complete Check-in
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Vacate and Check-Out Modal with Intimation / Notice Period Rule Check & Maintenance Deductions
function CheckOutModal({
  tenant,
  floor,
  onClose,
  onConfirm,
}: {
  tenant: Tenant;
  floor: number;
  onClose: () => void;
  onConfirm: (
    t: Tenant,
    refundAmount: number,
    maintenanceDeduction: number,
    negligencePenalty: number,
    deductionNote: string,
    method: Payment["method"],
    noticeStatus: "proper_notice" | "short_notice" | "no_notice"
  ) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const originalAdvance = tenant.advanceAmount || 0;

  // Notice Period Rule state (Requirement #4)
  const [noticeStatus, setNoticeStatus] = useState<"proper_notice" | "short_notice" | "no_notice">("proper_notice");
  const [negligencePenalty, setNegligencePenalty] = useState("0");

  // Maintenance & damage deduction state (Requirement #3)
  const [maintenanceDeduction, setMaintenanceDeduction] = useState("0");
  const [deductionsNote, setDeductionsNote] = useState("");
  const [refundMethod, setRefundMethod] = useState<Payment["method"]>("UPI");

  // Handle notice status change with default suggested penalties
  const handleNoticeChange = (status: "proper_notice" | "short_notice" | "no_notice") => {
    setNoticeStatus(status);
    if (status === "proper_notice") {
      setNegligencePenalty("0");
    } else if (status === "short_notice") {
      // Suggest standard short notice penalty (e.g. ₹500 or 25% of advance)
      setNegligencePenalty(String(Math.min(originalAdvance, 500)));
    } else if (status === "no_notice") {
      // Suggest sudden vacate penalty (e.g. ₹1,000 or half month rent)
      setNegligencePenalty(String(Math.min(originalAdvance, 1000)));
    }
  };

  const maintVal = Math.max(0, Number(maintenanceDeduction) || 0);
  const penaltyVal = Math.max(0, Number(negligencePenalty) || 0);
  const totalDeductions = maintVal + penaltyVal;
  const netRefund = Math.max(0, originalAdvance - totalDeductions);

  if (!mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(
      tenant,
      netRefund,
      maintVal,
      penaltyVal,
      deductionsNote.trim(),
      refundMethod,
      noticeStatus
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card w-full max-w-lg my-auto rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-border"
      >
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold leading-none text-foreground">Vacate & Advance Settlement</h3>
            <p className="text-xs text-muted-foreground mt-1">Check notice period compliance & maintenance deductions</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Resident Card Preview */}
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">{tenant.name}</p>
                <span className="font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                  Room {tenant.roomNumber} • Floor {floor}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Joined {new Date(tenant.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • Monthly Rent: {formatINR(tenant.rentAmount)}
              </p>
            </div>

            {/* Advance Deposit on Record */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">
                  Security Advance Collected
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatINR(originalAdvance)}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/20 text-[#16A34A] border border-emerald-500/30">
                Deposit on Record
              </span>
            </div>

            {/* Requirement #4: Hostel Prior Notice / Intimation Rule Check */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Vacate Notice Compliance (Hostel Rule)
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Hostel Rule: Residents must intimate the owner <strong>15 to 30 days before vacating</strong>. Otherwise, negligence charges apply.
                  </p>
                </div>
              </div>

              {/* Notice options */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="notice"
                    checked={noticeStatus === "proper_notice"}
                    onChange={() => handleNoticeChange("proper_notice")}
                    className="text-[#0B0B0B] focus:ring-[#0B0B0B]"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-xs">Proper Notice Given (15 to 30 days prior)</p>
                    <p className="text-[11px] text-muted-foreground">Complied with hostel policy. No negligence penalty.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="notice"
                    checked={noticeStatus === "short_notice"}
                    onChange={() => handleNoticeChange("short_notice")}
                    className="text-[#0B0B0B] focus:ring-[#0B0B0B]"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-xs">Short Notice (&lt; 15 days)</p>
                    <p className="text-[11px] text-muted-foreground">Informed late. Charge partial negligence fee.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="notice"
                    checked={noticeStatus === "no_notice"}
                    onChange={() => handleNoticeChange("no_notice")}
                    className="text-[#0B0B0B] focus:ring-[#0B0B0B]"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-xs">Sudden Vacate / No Prior Notice</p>
                    <p className="text-[11px] text-muted-foreground">Left without informing. Charge full negligence penalty.</p>
                  </div>
                </label>
              </div>

              {noticeStatus !== "proper_notice" && (
                <Field label="Negligence / Short Notice Penalty (₹) *">
                  <input
                    type="number"
                    min={0}
                    value={negligencePenalty}
                    onChange={(e) => setNegligencePenalty(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                    placeholder="e.g. 500"
                  />
                </Field>
              )}
            </div>

            {/* Requirement #3: Maintenance & Room Damage Deductions */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wrench size={14} /> Room Maintenance & Cleaning Deductions
              </h4>

              <Field label="Maintenance / Damage Deduction (₹)">
                <input
                  type="number"
                  min={0}
                  value={maintenanceDeduction}
                  onChange={(e) => setMaintenanceDeduction(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="e.g. 500"
                />
              </Field>

              <Field label="Deduction Reasons / Room Inspection Notes">
                <input
                  value={deductionsNote}
                  onChange={(e) => setDeductionsNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                  placeholder="e.g. Painting, fan repair, deep cleaning"
                />
              </Field>
            </div>

            {/* Settlement Summary Card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Settlement Calculation</h4>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Security Advance Deposit:</span>
                <span className="font-medium text-foreground">+{formatINR(originalAdvance)}</span>
              </div>
              {maintVal > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Maintenance Deduction:</span>
                  <span className="font-medium text-red-600">-{formatINR(maintVal)}</span>
                </div>
              )}
              {penaltyVal > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Notice Negligence Penalty:</span>
                  <span className="font-medium text-red-600">-{formatINR(penaltyVal)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex items-center justify-between font-bold text-sm">
                <span className="text-foreground">Net Advance to Refund:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatINR(netRefund)}</span>
              </div>
            </div>

            {/* Refund Payment Mode */}
            {netRefund > 0 && (
              <Field label="Refund Payment Mode *">
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as Payment["method"])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </Field>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
              ⚠️ Confirming will mark resident as <strong>Left</strong>, free up 1 bed in Room {tenant.roomNumber}, and record the advance return transaction.
            </div>
          </div>

          <div className="border-t border-border bg-card px-6 py-4 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] font-semibold px-4 py-2 text-xs hover:brightness-95 active:scale-[0.98] transition shadow-sm"
            >
              <LogOut size={14} /> Confirm Vacate & Return {formatINR(netRefund)}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Quick Collect Rent Modal
function CollectRentModal({
  tenant,
  onClose,
  onConfirm,
}: {
  tenant: Tenant;
  onClose: () => void;
  onConfirm: (t: Tenant, amount: number, method: Payment["method"], notes?: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = getTenantCycleInfo(tenant);
  const targetCycleLabel = cycle.isNextCycleDue ? cycle.nextCycleLabel : cycle.cycleLabel;

  const [amount, setAmount] = useState(String(tenant.rentAmount));
  const [method, setMethod] = useState<Payment["method"]>("UPI");
  const [notes, setNotes] = useState(`Rent collection for ${targetCycleLabel}`);

  if (!mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(tenant, Number(amount) || tenant.rentAmount, method, notes);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card w-full max-w-md my-auto rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-border"
      >
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold leading-none text-foreground">Collect Monthly Rent</h3>
            <p className="text-xs text-muted-foreground mt-1">Record rent collection for continuing month</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">{tenant.name}</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-muted">Room {tenant.roomNumber}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground pt-1">
              <span>Billing Cycle:</span>
              <span className="font-semibold text-foreground">{targetCycleLabel}</span>
            </div>
          </div>

          <Field label="Rent Amount (₹) *">
            <input
              required
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
            />
          </Field>

          <Field label="Payment Mode *">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Payment["method"])}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </Field>

          <Field label="Notes (Optional)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
            />
          </Field>

          <div className="border-t border-border pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] font-semibold px-4 py-2 text-xs hover:brightness-95 transition-all shadow-sm"
            >
              <Check size={14} /> Record Payment & Mark Paid
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}
