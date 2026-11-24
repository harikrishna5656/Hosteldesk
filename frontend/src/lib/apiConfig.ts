export const DEFAULT_PROD_API_URL = "https://hosteldesk-x1f4.onrender.com";

export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof envUrl === "string" && envUrl.trim() && !envUrl.includes("undefined")) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:3001";
  }
  return DEFAULT_PROD_API_URL;
}

export const API_URL = getApiUrl();
