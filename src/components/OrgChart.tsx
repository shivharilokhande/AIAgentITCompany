// src/components/OrgChart.tsx
// SVG org chart of the 15 company personas, laid out by layer. Pure component (works in server and client trees).
// `live` marks the persona working right now: the box glows, gets a spinning progress arc and shows the step label.
// `counts` shows how many steps each persona has contributed in the current run; personas with 0 are dimmed.
import type { Persona } from "@/lib/types";

const W = 1100;
const ROW_H = 120;
const BOX_W = 150;
const BOX_H = 64;
const LAYER_LABEL = ["", "Master Agent", "C-Suite", "Directors", "Leads", "Engineers"];

export interface LivePersona { persona: string; label: string; message: string }

export function OrgChart({ personas, highlight = [], live, counts }: { personas: Persona[]; highlight?: string[]; live?: LivePersona | null; counts?: Record<string, number> }) {
  const layers = [1, 2, 3, 4, 5].map((l) => personas.filter((p) => p.layer === l));
  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((ps, li) => {
    const gap = W / (ps.length + 1);
    ps.forEach((p, i) => pos.set(p.id, { x: gap * (i + 1), y: 40 + li * ROW_H }));
  });
  const H = 40 + layers.length * ROW_H;
  const hl = new Set(highlight);
  const hasCounts = counts && Object.keys(counts).length > 0;
  const livePos = live ? pos.get(live.persona) : undefined;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Smart IT company org chart">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* layer labels */}
      {layers.map((_, li) => (
        <text key={li} x={8} y={40 + li * ROW_H + 4} fontSize={11} fontWeight={700} style={{ textTransform: "uppercase", letterSpacing: 1 }} className="fill-muted">
          {LAYER_LABEL[li + 1]}
        </text>
      ))}
      {/* edges */}
      {personas.map((p) => {
        if (!p.reportsTo) return null;
        const a = pos.get(p.reportsTo), b = pos.get(p.id);
        if (!a || !b) return null;
        const midY = (a.y + BOX_H / 2 + b.y - BOX_H / 2) / 2;
        const lit = live && (p.id === live.persona || p.reportsTo === live.persona);
        return (
          <path key={p.id} d={`M ${a.x} ${a.y + BOX_H / 2} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y - BOX_H / 2}`} fill="none" strokeWidth={lit ? 2 : 1.5} className={lit ? "stroke-accent" : "stroke-border-2"} opacity={lit ? 0.9 : 1} />
        );
      })}
      {/* nodes */}
      {personas.map((p) => {
        const c = pos.get(p.id)!;
        const isLive = live?.persona === p.id;
        const n = counts?.[p.id] ?? 0;
        const involved = hasCounts ? n > 0 : hl.size === 0 || hl.has(p.id);
        const opacity = isLive ? 1 : involved ? 1 : 0.35;
        const stroke = isLive ? "stroke-accent" : hl.has(p.id) ? "stroke-accent" : "stroke-border-2";
        return (
          <g key={p.id} transform={`translate(${c.x - BOX_W / 2}, ${c.y - BOX_H / 2})`} opacity={opacity} style={{ transition: "opacity .4s" }}>
            {isLive && (
              <rect x={-4} y={-4} width={BOX_W + 8} height={BOX_H + 8} rx={13} className="fill-accent/20 animate-pulse" filter="url(#glow)" />
            )}
            <rect width={BOX_W} height={BOX_H} rx={10} className={`${isLive ? "fill-accent/15" : p.layer === 1 ? "fill-accent/10" : "fill-surface-2"} ${stroke}`} strokeWidth={isLive ? 2.5 : hl.has(p.id) ? 2 : 1} />
            <text x={12} y={22} fontSize={12} fontWeight={700} className="fill-fg">{p.name}</text>
            <text x={12} y={39} fontSize={10.5} className="fill-muted">{p.role}</text>
            <text x={12} y={54} fontSize={9.5} className={isLive ? "fill-accent" : "fill-accent"} fontWeight={isLive ? 700 : 400}>
              {isLive ? `${live!.label}…` : p.focus[0]}
            </text>
            {/* step count badge */}
            {hasCounts && n > 0 && !isLive && (
              <g transform={`translate(${BOX_W - 22}, 10)`}>
                <rect width={20} height={16} rx={8} className="fill-accent/15" />
                <text x={10} y={12} textAnchor="middle" fontSize={9.5} fontWeight={700} className="fill-accent">{n > 99 ? "99+" : n}</text>
              </g>
            )}
            {/* spinning arc = working now */}
            {isLive && (
              <g transform={`translate(${BOX_W - 18}, 18)`}>
                <circle r={9} fill="none" strokeWidth={2.5} className="stroke-accent/25" />
                <circle r={9} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="20 40" className="stroke-accent animate-spin" style={{ transformOrigin: "0 0" }} />
              </g>
            )}
          </g>
        );
      })}
      {/* live caption under the active box */}
      {live && livePos && (
        <g transform={`translate(${Math.min(Math.max(livePos.x, 190), W - 190)}, ${livePos.y + BOX_H / 2 + 14})`}>
          <rect x={-180} y={0} width={360} height={22} rx={6} className="fill-surface stroke-accent/40" strokeWidth={1} />
          <text x={0} y={15} textAnchor="middle" fontSize={10} className="fill-fg-2">{live.message.length > 62 ? live.message.slice(0, 60) + "…" : live.message}</text>
        </g>
      )}
    </svg>
  );
}
