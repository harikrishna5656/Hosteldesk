import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, BedDouble, X, Check, Calendar as CalendarIcon, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { type Room, formatINR } from "@/lib/mockData";
import { useHostel } from "@/lib/hostelContext";
import { AddHostelDialog } from "@/components/dialogs/AddHostelDialog";

export const Route = createFileRoute("/rooms")({
  head: () => ({ meta: [{ title: "Rooms — HostelDesk" }, { name: "description", content: "Manage rooms, beds and availability." }] }),
  component: RoomsPage,
});

function RoomsPage() {
  const { rooms, addRoom, updateRoom, deleteRoom, canDeleteRoom, hostels, activeHostel, isPortfolioView } = useHostel();
  const [filter, setFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");
  const [selectedFloor, setSelectedFloor] = useState<"all" | number>("all");
  const [groupByFloor, setGroupByFloor] = useState<boolean>(true);
  const [view, setView] = useState<"grid" | "calendar">("grid");
  const [editing, setEditing] = useState<Room | null>(null);
  const [open, setOpen] = useState(false);
  const [showAddHostel, setShowAddHostel] = useState(false);

  const uniqueFloors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b),
    [rooms]
  );

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      const matchesStatus = filter === "all" || r.status === filter;
      const matchesFloor = selectedFloor === "all" || r.floor === selectedFloor;
      return matchesStatus && matchesFloor;
    });
  }, [rooms, filter, selectedFloor]);

  const groupedByFloor = useMemo(() => {
    const map = new Map<number, Room[]>();
    filtered.forEach((r) => {
      if (!map.has(r.floor)) map.set(r.floor, []);
      map.get(r.floor)!.push(r);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, floorRooms]) => ({
        floor,
        rooms: floorRooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
      }));
  }, [filtered]);

  const save = (r: Room) => {
    if (editing) {
      updateRoom(r);
      toast.success("Room updated");
    } else {
      addRoom(r);
      toast.success(`Room ${r.number} (${r.type} • ${r.capacity} beds) added`);
    }
    setOpen(false);
    setEditing(null);
  };

  const remove = (id: string) => {
    const res = deleteRoom(id);
    if (!res.success) {
      toast.error("Cannot Delete Room", { description: res.error });
    } else {
      toast.success("Room deleted successfully");
    }
  };

  // If no hostels exist yet, guide user to create their first hostel
  if (hostels.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Room management"
          subtitle="Register your hostel property before configuring rooms"
        />
        <div className="rounded-2xl bg-card border border-border p-12 text-center max-w-md mx-auto my-12 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center mx-auto mb-4 font-bold shadow-sm">
            <Building2 size={28} />
          </div>
          <h2 className="text-lg font-bold text-foreground">Step 1: Create Hostel Branch</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Rooms belong to a hostel property. Please register your hostel branch first, then add rooms with bed capacities.
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
        title="Room management"
        subtitle={`${rooms.length} rooms across ${new Set(rooms.map(r => r.floor)).size} floors (${isPortfolioView ? "All Hostels" : activeHostel?.name ?? "Selected Hostel"})`}
        action={
          <button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] font-semibold px-4 py-2.5 text-sm shadow-sm hover:brightness-95 active:scale-[0.98] transition-all"
          >
            <Plus size={16} /> Add room
          </button>
        }
      />

      {/* Filters and Floor Segregation Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Status:</span>
            {(["all", "available", "occupied", "maintenance"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${filter === f
                  ? "bg-[#0B0B0B] text-white dark:bg-[#EEFF2E] dark:text-[#0B0B0B] shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {view === "grid" && (
              <button
                onClick={() => setGroupByFloor((p) => !p)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  groupByFloor
                    ? "bg-[#0B0B0B] text-[#EEFF2E] border-[#0B0B0B] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] dark:border-[#EEFF2E]"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Floor Grouping:</span>
                <span className="font-bold">{groupByFloor ? "ON" : "OFF"}</span>
              </button>
            )}

            <div className="flex bg-card border border-border rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === "grid"
                  ? "bg-[#0B0B0B] text-white dark:bg-[#EEFF2E] dark:text-[#0B0B0B]"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Grid
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${view === "calendar"
                  ? "bg-[#0B0B0B] text-white dark:bg-[#EEFF2E] dark:text-[#0B0B0B]"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <CalendarIcon size={12} /> Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Floor Selection Pills */}
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
              All Floors ({rooms.length})
            </button>
            {uniqueFloors.map((floor) => {
              const count = rooms.filter((r) => r.floor === floor).length;
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

      {view === "grid" ? (
        filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            <BedDouble className="mx-auto mb-3 opacity-40" size={36} />
            <p className="text-sm font-semibold text-foreground">No rooms found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {rooms.length === 0
                ? 'Click "+ Add room" above to create rooms for this hostel'
                : "Try adjusting your floor or status filter"}
            </p>
          </div>
        ) : groupByFloor && selectedFloor === "all" ? (
          <div className="space-y-6">
            {groupedByFloor.map(({ floor, rooms: floorRooms }) => {
              const floorBeds = floorRooms.reduce((acc, r) => acc + r.capacity, 0);
              const floorOccupied = floorRooms.reduce((acc, r) => acc + r.occupied, 0);
              const floorVacant = floorBeds - floorOccupied;
              return (
                <div key={floor} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0B0B0B] dark:bg-[#EEFF2E]" />
                      <h3 className="font-bold text-sm text-foreground">Floor {floor}</h3>
                      <span className="text-xs text-muted-foreground font-medium">
                        ({floorRooms.length} room{floorRooms.length === 1 ? "" : "s"} • {floorOccupied}/{floorBeds} beds occupied • {floorVacant} vacant)
                      </span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {floorRooms.map((r) => {
                      const deleteCheck = canDeleteRoom(r.id);
                      return (
                        <RoomCard
                          key={r.id}
                          room={r}
                          canDelete={deleteCheck.allowed}
                          deleteReason={deleteCheck.reason}
                          onEdit={() => { setEditing(r); setOpen(true); }}
                          onDelete={() => remove(r.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((r) => {
              const deleteCheck = canDeleteRoom(r.id);
              return (
                <RoomCard
                  key={r.id}
                  room={r}
                  canDelete={deleteCheck.allowed}
                  deleteReason={deleteCheck.reason}
                  onEdit={() => { setEditing(r); setOpen(true); }}
                  onDelete={() => remove(r.id)}
                />
              );
            })}
          </div>
        )
      ) : (
        <CalendarView rooms={rooms} />
      )}

      {open && <RoomFormModal room={editing} onClose={() => { setOpen(false); setEditing(null); }} onSave={save} />}
    </div>
  );
}

function RoomCard({
  room,
  canDelete,
  deleteReason,
  onEdit,
  onDelete,
}: {
  room: Room;
  canDelete: boolean;
  deleteReason?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusBadge = {
    available: "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20",
    occupied: "bg-blue-500/10 text-[#2563EB] border-blue-500/20",
    maintenance: "bg-amber-500/10 text-[#D97706] border-amber-500/20",
  }[room.status];

  const availableBeds = room.capacity - room.occupied;

  const handleDeleteClick = () => {
    if (!canDelete) {
      toast.error(`Cannot Delete Room ${room.number}`, {
        description: deleteReason || "Active residents are currently assigned to this room.",
      });
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete Room ${room.number}? This will remove the room and its beds.`)) {
      onDelete();
    }
  };

  return (
    <div className="group rounded-2xl bg-card border border-border p-5 hover:border-foreground/30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center font-bold">
            <BedDouble size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${statusBadge}`}>
              {room.status}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-2xl font-bold text-foreground">Room {room.number}</p>
            <span className="text-[11px] font-semibold text-muted-foreground">Floor {room.floor}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {room.type} sharing • {availableBeds > 0 ? `${availableBeds} bed(s) available` : "Full occupancy"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-xl bg-muted/60 p-2.5">
            <p className="text-muted-foreground text-[10px] uppercase font-semibold">Beds Occupied</p>
            <p className="font-bold text-foreground mt-0.5">
              {room.occupied} / {room.capacity}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2.5">
            <p className="text-muted-foreground text-[10px] uppercase font-semibold">Rent / Bed</p>
            <p className="font-bold text-foreground mt-0.5">{formatINR(room.rent)}</p>
          </div>
        </div>

        {/* Capacity Progress Bar */}
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${room.occupied >= room.capacity
                ? "bg-blue-600"
                : room.occupied > 0
                  ? "bg-[#0B0B0B] dark:bg-[#EEFF2E]"
                  : "bg-emerald-500"
                }`}
              style={{ width: `${Math.min(100, (room.occupied / room.capacity) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-between">
            <span>{room.occupied > 0 ? `${room.occupied} resident(s) staying` : "Vacant"}</span>
            <span>{availableBeds} free</span>
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
        >
          <Pencil size={12} /> Edit
        </button>
        <button
          onClick={handleDeleteClick}
          title={canDelete ? "Delete room" : deleteReason}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${canDelete
            ? "border-destructive/20 text-destructive hover:bg-destructive/10"
            : "border-border text-muted-foreground/60 hover:border-destructive/40 hover:text-destructive cursor-pointer"
            }`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function RoomFormModal({ room, onClose, onSave }: { room: Room | null; onClose: () => void; onSave: (r: Room) => void }) {
  const { activeHostel, hostels, isPortfolioView } = useHostel();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [form, setForm] = useState<Room>(
    room ?? {
      id: crypto.randomUUID(),
      hostelId: activeHostel?.id || hostels[0]?.id || "",
      number: "",
      type: "Single",
      capacity: 1,
      occupied: 0,
      rent: 8000,
      floor: 1,
      status: "available",
    }
  );

  const handleTypeChange = (newType: Room["type"]) => {
    const defaultCapacity = newType === "Single" ? 1 : newType === "Double" ? 2 : newType === "Triple" ? 3 : 4;
    setForm((prev) => {
      // Don't reduce capacity below current occupants
      const validCapacity = Math.max(defaultCapacity, prev.occupied);
      const isFull = prev.occupied >= validCapacity;
      return {
        ...prev,
        type: newType,
        capacity: validCapacity,
        status: prev.status === "maintenance" ? "maintenance" : isFull ? "occupied" : "available",
      };
    });
  };

  const handleCapacityChange = (newCap: number) => {
    if (newCap < form.occupied) {
      toast.error(`Cannot set capacity below currently occupied beds (${form.occupied})`);
      return;
    }
    const isFull = form.occupied >= newCap;
    setForm((prev) => ({
      ...prev,
      capacity: newCap,
      status: prev.status === "maintenance" ? "maintenance" : isFull ? "occupied" : "available",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.number.trim()) {
      toast.error("Please enter a room number");
      return;
    }
    if (form.capacity < 1) {
      toast.error("Capacity must be at least 1 bed");
      return;
    }
    onSave(form);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div>
            <h3 className="text-base font-semibold leading-none text-foreground">{room ? "Edit Room" : "Add New Room"}</h3>
            <p className="text-xs text-muted-foreground mt-1">Configure room details, bed capacity, and monthly rent</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* If in portfolio view or editing across hostels, allow branch selection */}
            {isPortfolioView && hostels.length > 1 && (
              <Field label="Hostel Branch *">
                <select
                  value={form.hostelId}
                  onChange={(e) => setForm({ ...form, hostelId: e.target.value })}
                  className={inputCls}
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city} • {h.code})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Room number *">
                <input
                  required
                  autoFocus
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value.trim() })}
                  className={inputCls}
                  placeholder="e.g. 101"
                />
              </Field>
              <Field label="Floor number *">
                <input
                  type="number"
                  min={0}
                  required
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: +e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Room Sharing Type">
                <select
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value as Room["type"])}
                  className={inputCls}
                >
                  <option value="Single">Single Sharing (1 Bed)</option>
                  <option value="Double">Double Sharing (2 Beds)</option>
                  <option value="Triple">Triple Sharing (3 Beds)</option>
                  <option value="Sharing">Multi-Bed Dormitory</option>
                </select>
              </Field>
              <Field label="Bed Capacity (Total)">
                <input
                  type="number"
                  min={Math.max(1, form.occupied)}
                  required
                  value={form.capacity}
                  onChange={(e) => handleCapacityChange(+e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Monthly Rent / Bed (₹) *">
                <input
                  type="number"
                  min={0}
                  required
                  value={form.rent}
                  onChange={(e) => setForm({ ...form, rent: +e.target.value })}
                  className={inputCls}
                  placeholder="8000"
                />
              </Field>
              <Field label="Currently Occupied Beds">
                <input
                  type="number"
                  disabled
                  value={form.occupied}
                  className={`${inputCls} bg-muted text-muted-foreground cursor-not-allowed`}
                  title="Updated automatically when residents check in or out"
                />
              </Field>
            </div>

            <Field label="Maintenance & Status">
              <div className="flex gap-2">
                {(["available", "occupied", "maintenance"] as const).map((s) => {
                  const isSelected = form.status === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${isSelected
                        ? "bg-[#0B0B0B] text-white border-[#0B0B0B] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] dark:border-[#EEFF2E] shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>

            {form.occupied > 0 && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-[#2563EB] flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{form.occupied} active resident(s) are currently assigned to this room.</span>
              </div>
            )}
          </div>

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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#EEFF2E] text-[#0B0B0B] text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition-all shadow-sm"
            >
              <Check size={16} /> Save Room
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E] transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function CalendarView({ rooms }: { rooms: Room[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="bg-muted/70">
            <tr>
              <th className="text-left p-3 font-semibold sticky left-0 bg-muted z-10 text-foreground">Room</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="p-2 font-medium text-muted-foreground min-w-[44px]">
                  <div>{d.toLocaleDateString("en-IN", { weekday: "short" })[0]}</div>
                  <div className="text-foreground font-semibold">{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium sticky left-0 bg-card text-foreground">
                  <div>Room {r.number}</div>
                  <div className="text-[10px] text-muted-foreground">{r.type}</div>
                </td>
                {days.map((d, i) => {
                  const occupied = r.occupied / r.capacity;
                  const cellState = r.status === "maintenance" ? "maint" : occupied >= 1 ? "full" : occupied > 0 ? "partial" : "free";
                  const cls = {
                    free: "bg-emerald-500/15",
                    partial: "bg-blue-500/15",
                    full: "bg-black/10 dark:bg-white/10",
                    maint: "bg-amber-500/20",
                  }[cellState];
                  return <td key={i} className={`p-2 border-l border-border/40 ${cls}`} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 p-3.5 border-t border-border text-xs text-muted-foreground">
        <Legend color="bg-emerald-500" label="Available" />
        <Legend color="bg-blue-500" label="Partially occupied" />
        <Legend color="bg-foreground" label="Fully occupied" />
        <Legend color="bg-amber-500" label="Maintenance" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label}</span>;
}
