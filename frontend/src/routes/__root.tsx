import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
  ErrorComponentProps,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth";
import { HostelProvider } from "@/lib/hostelContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const errorMessage = error instanceof Error ? error.message : String(error);

  const isChunkLoadFailed =
    errorMessage.includes("Failed to fetch dynamically imported module") ||
    errorMessage.includes("reading 'component'") ||
    errorMessage.includes("Loading chunk") ||
    errorMessage.includes("404");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">
          {isChunkLoadFailed ? "Update Available" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isChunkLoadFailed
            ? "A newer version of the application was deployed. Please reload to load the latest update."
            : errorMessage}
        </p>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            } else {
              router.invalidate();
              reset();
            }
          }}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {isChunkLoadFailed ? "Reload Application" : "Try again"}
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "HostelDesk — Hostel & PG Property Management" },
      { name: "description", content: "Modern property management for hostels and PGs. Track rooms, tenants, payments and expenses in one place." },
      { property: "og:title", content: "HostelDesk — Hostel & PG Property Management" },
      { property: "og:description", content: "Modern property management for hostels and PGs. Track rooms, tenants, payments and expenses in one place." },
      { name: "twitter:title", content: "HostelDesk — Hostel & PG Property Management" },
      { name: "twitter:description", content: "Modern property management for hostels and PGs. Track rooms, tenants, payments and expenses in one place." },
      { property: "og:image", content: "/logo.png" },
      { name: "twitter:image", content: "/logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "google-site-verification", content: "_NaXdoso2_A6JUFpJEwukOJMS4six19fpIn0OQUpNMY" },
    ],
    links: [
      { rel: "icon", href: "/logo-icon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Automatically recover when dynamic imports fail due to new deployments replacing old chunks
    const handlePreloadError = (event: any) => {
      console.warn("[Vite] Dynamic import chunk failed (new deployment). Reloading page...");
      event?.preventDefault?.();
      window.location.reload();
    };

    window.addEventListener("vite:preloadError", handlePreloadError);
    return () => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HostelProvider>
          <AppShell />
        </HostelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
