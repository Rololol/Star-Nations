import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        faction: {
          terran: {
            DEFAULT: "#3B82F6",
            glow: "rgba(59,130,246,0.4)",
          },
          vectis: {
            DEFAULT: "#10B981",
            glow: "rgba(16,185,129,0.4)",
          },
          onyx: {
            DEFAULT: "#8B5CF6",
            glow: "rgba(139,92,246,0.4)",
          },
          zyrion: {
            DEFAULT: "#EF4444",
            glow: "rgba(239,68,68,0.4)",
          },
          eldar: {
            DEFAULT: "#F59E0B",
            glow: "rgba(245,158,11,0.4)",
          },
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.08)",
          hover: "rgba(255,255,255,0.1)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "star-field":
          "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 50% 70%, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 80% 10%, rgba(255,255,255,0.5), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
