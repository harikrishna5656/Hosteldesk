import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Plus, Layers, MapPin } from "lucide-react";
import { useHostel } from "@/lib/hostelContext";
import { AddHostelDialog } from "../dialogs/AddHostelDialog";

export function HostelSwitcher({
  compact = false,
  direction = "down",
}: {
  compact?: boolean;
  direction?: "up" | "down";
}) {
  const { hostels, activeHostelId, activeHostel, isPortfolioView, setActiveHostelId, allRooms } = useHostel();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Switcher Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-all shadow-sm ${
          compact
            ? "w-full bg-[#181818] border border-[#262626] text-white hover:bg-[#202020]"
            : "min-w-[200px] max-w-[280px] bg-card border border-border text-foreground hover:bg-muted/50"
        }`}
        title="Switch active hostel or view portfolio"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              compact
                ? "bg-[#EEFF2E] text-[#0B0B0B] font-bold"
                : "bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B]"
            }`}
          >
            {isPortfolioView ? <Layers size={16} /> : <Building2 size={16} />}
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold truncate leading-tight block">
                {isPortfolioView ? "All Hostels" : activeHostel?.name ?? "Select Hostel"}
              </span>
              {!isPortfolioView && activeHostel?.type && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${
                    activeHostel.type === "Boys"
                      ? "bg-blue-500/10 text-[#2563EB] border-blue-500/20"
                      : activeHostel.type === "Girls"
                      ? "bg-pink-500/10 text-pink-600 border-pink-500/20"
                      : "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20"
                  }`}
                >
                  {activeHostel.type}
                </span>
              )}
            </div>
            <p className={`text-[11px] truncate leading-tight mt-0.5 ${compact ? "text-[#9CA3AF]" : "text-muted-foreground"}`}>
              {isPortfolioView ? "Portfolio Overview" : `${activeHostel?.city ?? "City"} • ${activeHostel?.code ?? "Code"}`}
            </p>
          </div>
        </div>
        <ChevronDown size={14} className={`shrink-0 ml-auto ${compact ? "text-[#9CA3AF]" : "text-muted-foreground"}`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          className={`absolute left-0 ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            compact ? "w-full min-w-[260px]" : "w-72"
          } rounded-2xl bg-card border border-border shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-2.5 py-1.5">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Switch Property Scope
            </p>
          </div>

          {/* Portfolio Option */}
          <button
            onClick={() => {
              setActiveHostelId("all");
              setDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
              isPortfolioView
                ? "bg-[#EEFF2E]/20 text-[#0B0B0B] dark:text-[#EEFF2E] font-semibold border border-[#EEFF2E]/40"
                : "hover:bg-muted text-foreground font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center">
                <Layers size={14} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-xs leading-none">All Hostels (Portfolio)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Consolidated view ({hostels.length} branches)</p>
              </div>
            </div>
            {isPortfolioView && <Check size={14} className="text-[#0B0B0B] dark:text-[#EEFF2E] shrink-0" />}
          </button>

          <div className="my-1.5 border-t border-border" />

          {/* Individual Hostels List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {hostels.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No hostel branches registered yet
              </div>
            ) : (
              hostels.map((hostel) => {
                const isSelected = activeHostelId === hostel.id;
                const branchRooms = allRooms.filter((r) => r.hostelId === hostel.id);
                const totalBeds = branchRooms.reduce((acc, r) => acc + r.capacity, 0);

                return (
                  <button
                    key={hostel.id}
                    onClick={() => {
                      setActiveHostelId(hostel.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? "bg-[#EEFF2E]/20 text-[#0B0B0B] dark:text-[#EEFF2E] font-semibold border border-[#EEFF2E]/40"
                        : "hover:bg-muted text-foreground font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                        <Building2 size={14} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-xs leading-none truncate">{hostel.name}</p>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-medium border ${
                              hostel.type === "Boys"
                                ? "bg-blue-500/10 text-[#2563EB] border-blue-500/20"
                                : hostel.type === "Girls"
                                ? "bg-pink-500/10 text-pink-600 border-pink-500/20"
                                : "bg-emerald-500/10 text-[#16A34A] border-emerald-500/20"
                            }`}
                          >
                            {hostel.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <MapPin size={10} />
                          <span>{hostel.city}</span>
                          <span>•</span>
                          <span>{totalBeds} beds</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-[#0B0B0B] dark:text-[#EEFF2E] shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="my-1.5 border-t border-border" />

          {/* Add New Hostel Button - Brand Highlighter Yellow CTA */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              setAddModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold bg-[#EEFF2E] text-[#0B0B0B] hover:brightness-95 transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus size={14} /> Add New Hostel Branch
          </button>
        </div>
      )}

      {/* Add Hostel Dialog */}
      <AddHostelDialog open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
