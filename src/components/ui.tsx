import type { ReactNode } from "react";

export function Card({ title, children, right, className = "" }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title ? <h3 className="text-sm font-semibold text-slate-100">{title}</h3> : <span />}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

const tones: Record<string, string> = {
  neutral: "bg-ink-700 text-slate-300",
  accent: "bg-accent/15 text-accent",
  good: "bg-good/15 text-good",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  P0: "bg-bad/15 text-bad",
  P1: "bg-warn/15 text-warn",
  P2: "bg-ink-700 text-slate-300",
};
export function Badge({ tone = "neutral", children, className = "" }: { tone?: keyof typeof tones | string; children: ReactNode; className?: string }) {
  return <span className={`badge ${tones[tone] ?? tones.neutral} ${className}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-sm text-slate-500">{children}</div>;
}

export function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "warn" | "bad" }) {
  const color = { accent: "bg-accent", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export const initials = (name: string): string => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 70% 70%)`, color: "#0b0f17" }}
    >
      {initials(name)}
    </span>
  );
}
