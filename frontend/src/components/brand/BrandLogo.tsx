import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  textColor?: "white" | "adaptive";
  subtitle?: string;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  textColor = "white",
  subtitle = "PG Manager",
  className = "",
}: BrandLogoProps) {
  const iconDimensions = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  }[size];

  const imgDimensions = {
    sm: "h-5 w-auto",
    md: "h-6 w-auto",
    lg: "h-8 w-auto",
  }[size];

  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }[size];

  const textCls = textColor === "white" ? "text-white" : "text-foreground";
  const subCls = textColor === "white" ? "text-[#9CA3AF]" : "text-muted-foreground";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Box: Midnight Black (#0B0B0B) container matching the official brand palette */}
      <div
        className={`${iconDimensions} rounded-xl bg-[#0B0B0B] border border-white/10 flex items-center justify-center p-1.5 shadow-sm shrink-0`}
      >
        <img
          src="/logo-icon.png"
          alt="HostelDesk"
          className={`${imgDimensions} object-contain`}
          loading="eager"
        />
      </div>

      {showText && (
        <div className="min-w-0">
          <p className={`font-display font-bold ${titleSizes} ${textCls} leading-tight tracking-tight`}>
            HostelDesk
          </p>
          {subtitle && (
            <p className={`text-[10px] uppercase font-semibold tracking-wider ${subCls} leading-tight mt-0.5`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Full vector SVG fallback/standalone component for high-DPI scaling
export function HostelDeskIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="HostelDesk Logo"
    >
      {/* Outer arched window frame */}
      <path
        d="M20 44 C20 28 32 18 50 18 C68 18 80 28 80 44 L80 80 L20 80 Z"
        fill="white"
      />
      {/* Bottom Sill Bar */}
      <rect x="14" y="82" width="72" height="6" rx="3" fill="white" />
      {/* Panes */}
      {/* Top Left Pane (Dark) */}
      <path
        d="M26 44 C26 33 34 26 46 25 L46 47 L26 47 Z"
        fill="#0B0B0B"
      />
      {/* Top Right Pane (Highlighter Yellow - #EEFF2E) */}
      <path
        d="M54 25 C66 26 74 33 74 44 L74 47 L54 47 Z"
        fill="#EEFF2E"
      />
      {/* Bottom Left Pane (Dark) */}
      <rect x="26" y="53" width="20" height="21" rx="1.5" fill="#0B0B0B" />
      {/* Bottom Right Pane (Dark) */}
      <rect x="54" y="53" width="20" height="21" rx="1.5" fill="#0B0B0B" />
    </svg>
  );
}
