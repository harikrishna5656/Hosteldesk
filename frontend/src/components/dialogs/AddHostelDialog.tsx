import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Building2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useHostel } from "@/lib/hostelContext";

interface AddHostelDialogProps {
  open: boolean;
  onClose: () => void;
}



export function AddHostelDialog({ open, onClose }: AddHostelDialogProps) {
  const { addHostel } = useHostel();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"Boys" | "Girls" | "Co-ed">("Boys");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !city.trim()) {
      toast.error("Please fill in Hostel Name, Code, and City");
      return;
    }

    addHostel({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      city: city.trim(),
      address: address.trim() || `${city.trim()} Main Road`,
      contactPhone: contactPhone.trim() || "+91 98000 00000",
    });

    toast.success(`Branch "${name}" created and set as active`);
    setName("");
    setCode("");
    setCity("");
    setAddress("");
    setContactPhone("");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] flex items-center justify-center font-semibold shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-none text-foreground">Add New Hostel Branch</h2>
              <p className="text-xs text-muted-foreground mt-1">Register a new property under your account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable if screen height is constrained */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Hostel / Property Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Royal Palms Luxury PG"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RPP-04"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Property Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "Boys" | "Girls" | "Co-ed")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                >
                  <option value="Boys">Boys PG</option>
                  <option value="Girls">Girls PG</option>
                  <option value="Co-ed">Co-ed Residency</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Address / Locality
              </label>
              <input
                type="text"
                placeholder="e.g. Lane 7, Koregaon Park"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
              />
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="px-6 py-4 border-t border-border shrink-0 bg-card flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#EEFF2E] text-[#0B0B0B] hover:brightness-95 active:scale-[0.98] shadow-sm transition-all"
            >
              <Plus size={16} /> Create Branch
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
