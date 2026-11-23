import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, BedDouble, Users, Wallet, Receipt, Bell, Moon, Sun, Menu, X, Building2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/auth";
import { useHostel } from "@/lib/hostelContext";
import { HostelSwitcher } from "./HostelSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";


const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rooms", label: "Rooms", icon: BedDouble },
  { to: "/tenants", label: "Tenants", icon: Users },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/notifications", label: "Alerts", icon: Bell },
] as const;

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefers = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : !!prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

export function AppShell() {
  const { dark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const isAuthPage = path === "/login" || path === "/signup";

  useEffect(() => {
    if (!isAuthenticated && !isAuthPage) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isAuthPage, navigate]);

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Outlet />
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "PG";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar - Midnight Black theme with Highlighter Yellow active state */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#1F1F1F] bg-[#0B0B0B] text-white sticky top-0 h-screen z-30">
        <Brand />
        <nav className="flex-1 px-3 py-3 space-y-1">
          {nav.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#EEFF2E] text-[#0B0B0B] font-semibold shadow-sm"
                    : "text-[#9CA3AF] hover:bg-[#1C1C1C] hover:text-white"
                }`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-[#0B0B0B] text-white flex flex-col h-full shadow-2xl border-r border-[#1F1F1F]">
            <div className="flex items-center justify-between p-4 border-b border-[#1F1F1F]">
              <Brand compact />
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-[#1C1C1C] text-[#9CA3AF] hover:text-white" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <div className="p-3 border-b border-[#1F1F1F]">
              <HostelSwitcher compact />
            </div>
            <nav className="flex-1 px-3 py-2 space-y-1">
              {nav.map((item) => {
                const active = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active ? "bg-[#EEFF2E] text-[#0B0B0B] font-semibold" : "text-[#9CA3AF] hover:bg-[#1C1C1C] hover:text-white"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted" aria-label="Open menu">
                <Menu size={20} />
              </button>
              <BrandLogo size="sm" textColor="adaptive" subtitle="" />
            </div>
            <div className="hidden lg:block shrink-0">
              <h2 className="font-display text-lg font-bold text-foreground">
                {nav.find((n) => n.to === path)?.label ?? "Dashboard"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="hidden md:flex items-center mx-2 min-w-0">
              <HostelSwitcher />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-muted text-foreground transition-colors" aria-label="Notifications">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              </Link>
              <button onClick={toggle} className="p-2 rounded-lg hover:bg-muted text-foreground transition-colors" aria-label="Toggle theme">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-border">
                <div className="w-8 h-8 rounded-full bg-[#0B0B0B] text-[#EEFF2E] dark:bg-[#EEFF2E] dark:text-[#0B0B0B] font-bold text-xs flex items-center justify-center border border-border shadow-sm shrink-0">
                  {initials}
                </div>
                <div className="hidden md:block max-w-[140px]">
                  <p className="text-sm font-semibold leading-tight text-foreground truncate">{user?.name ?? "PG Owner"}</p>
                  <p className="text-xs text-muted-foreground leading-tight">Property Owner</p>
                </div>
                <button
                  onClick={() => { logout(); navigate({ to: "/login" }); }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile bottom tab - sleek dark bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0B0B] text-white border-t border-[#1F1F1F]">
          <div className="grid grid-cols-5 px-2 py-1.5">
            {nav.slice(0, 5).map((item) => {
              const active = path === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    active ? "text-[#EEFF2E] font-semibold" : "text-[#9CA3AF]"
                  }`}
                >
                  <item.icon size={19} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "p-5 border-b border-[#1F1F1F]"}>
      <BrandLogo size={compact ? "sm" : "md"} textColor="white" subtitle="PG Manager" />
    </div>
  );
}
