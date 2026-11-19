import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — HostelDesk" },
      { name: "description", content: "Log in to HostelDesk PG Management System." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate({ to: "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } else {
      setError(result.error || "Please enter valid credentials.");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center mb-8">
        <BrandLogo size="lg" textColor="adaptive" subtitle="PG Property Management" />
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm">
        <h1 className="text-xl font-bold text-foreground text-center mb-1">Welcome back</h1>
        <p className="text-xs text-muted-foreground text-center mb-6">Sign in to your PG management dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E]"
              placeholder="owner@pg.com"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B0B0B] focus:border-[#0B0B0B] dark:focus:ring-[#EEFF2E] pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#EEFF2E] text-[#0B0B0B] py-2.5 text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition shadow-sm disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-center mt-6 text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-foreground font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
