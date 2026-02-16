import type { AgentType } from "@/types";

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "About", href: "/#about" },
  { label: "GitHub", href: "https://github.com/Lona44/procurement-intelligence", external: true },
  { label: "Contact", href: "/#contact" },
];

export const AGENT_CONFIG: Record<AgentType, { label: string; color: string; tagline: string }> = {
  conservative: {
    label: "Conservative",
    color: "#14b8a6",
    tagline: "Low-risk, proven strategies",
  },
  aggressive: {
    label: "Aggressive",
    color: "#f97316",
    tagline: "High-impact, maximum savings",
  },
  balanced: {
    label: "Balanced",
    color: "#6366f1",
    tagline: "Risk-weighted optimization",
  },
};

export const EASE = [0.25, 0.1, 0.25, 1] as const;

/** Reusable Framer Motion animation presets */
export const ANIM = {
  fadeInUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  },
  buttonTap: {
    whileHover: { scale: 1.03 },
    whileTap: { scale: 0.97 },
  },
} as const;

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
