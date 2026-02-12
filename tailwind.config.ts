import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        profeta: {
          bg: "#F5F5F5",
          surface: "#F5F5F5",
          card: "#FFFFFF",
          elevated: "#EEEFEF",
          border: "#E5E5E5",
          "text-primary": "#212528",
          "text-secondary": "#6B7280",
          "text-muted": "#9CA3AF",
          // Landing/auth aliases (prompt design system)
          primary: "#1A1A1A",
          secondary: "#6B7280",
          muted: "#9CA3AF",
          green: "#52796A",
          red: "#DC2626",
          amber: "#D97706",
          blue: "#52796A",
          purple: "#6B8F7B",
          cyan: "#7FA08A",
        },
      },
      fontFamily: {
        body: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", '"JetBrains Mono"', "monospace"],
        display: ["var(--font-display)", "DM Serif Display", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "16px",
        component: "12px",
        badge: "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        dotPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-up-1": "fadeUp 0.5s ease-out 0.05s forwards",
        "fade-up-2": "fadeUp 0.5s ease-out 0.1s forwards",
        "fade-up-3": "fadeUp 0.5s ease-out 0.15s forwards",
        "fade-up-4": "fadeUp 0.5s ease-out 0.2s forwards",
        "dot-pulse": "dotPulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
