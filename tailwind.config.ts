import type { Config } from "tailwindcss";

// Semantic palette: every color is a CSS variable (RGB triple) so light/dark switch via [data-theme].
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // legacy names kept so existing components re-theme automatically
        ink: { 950: v("--bg"), 900: v("--surface"), 800: v("--surface-2"), 700: v("--border"), 600: v("--border-2") },
        slate: { 50: v("--fg"), 100: v("--fg"), 200: v("--fg-2"), 300: v("--fg-2"), 400: v("--muted"), 500: v("--muted"), 600: v("--muted-2"), 700: v("--muted-2") },
        // semantic names for new code
        bg: v("--bg"), surface: v("--surface"), "surface-2": v("--surface-2"), border: v("--border"), "border-2": v("--border-2"),
        fg: v("--fg"), "fg-2": v("--fg-2"), muted: v("--muted"), "muted-2": v("--muted-2"),
        accent: { DEFAULT: v("--accent"), dim: v("--accent-dim"), fg: v("--accent-fg") },
        warn: v("--warn"), bad: v("--bad"), good: v("--good"), info: v("--info"),
      },
      boxShadow: { card: "0 1px 2px rgb(15 23 42 / 0.06), 0 1px 3px rgb(15 23 42 / 0.08)", pop: "0 10px 40px rgb(15 23 42 / 0.18)" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      keyframes: { fadein: { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } } },
      animation: { fadein: "fadein .18s ease-out" },
    },
  },
  plugins: [],
};
export default config;
