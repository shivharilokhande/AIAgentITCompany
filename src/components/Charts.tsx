// src/components/Charts.tsx
// Hand-rolled SVG charts. No dependencies.
import type { BurndownPoint, VelocityPoint } from "@/lib/types";

export function Burndown({ points }: { points: BurndownPoint[] }) {
  const W = 520, H = 200, pad = { l: 34, r: 12, t: 12, b: 26 };
  if (points.length === 0) return <div className="text-sm text-slate-500">No sprint dates / stories to chart.</div>;
  const max = Math.max(1, ...points.map((p) => Math.max(p.ideal, Number.isNaN(p.remaining) ? 0 : p.remaining)));
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ideal = points.map((p, i) => `${x(i)},${y(p.ideal)}`).join(" ");
  const actualPts = points.filter((p) => !Number.isNaN(p.remaining));
  const actual = actualPts.map((p) => `${x(points.indexOf(p))},${y(p.remaining)}`).join(" ");
  const last = actualPts[actualPts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sprint burndown">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)}  className="stroke-border" />
          <text x={pad.l - 6} y={y(max * t) + 4} textAnchor="end" fontSize={10} className="fill-muted">{Math.round(max * t)}</text>
        </g>
      ))}
      <polyline points={ideal} fill="none" strokeWidth={1.5} strokeDasharray="4 4"  className="stroke-muted" />
      {actual && <polyline points={actual} fill="none" strokeWidth={2.5}  className="stroke-accent" />}
      {last && <circle cx={x(points.indexOf(last))} cy={y(last.remaining)} r={4}  className="fill-accent" />}
      {points.map((p, i) => (i % Math.ceil(points.length / 7) === 0 || i === points.length - 1) && (
        <text key={p.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9.5} className="fill-muted">{p.day.slice(5)}</text>
      ))}
      <text x={W - pad.r} y={pad.t + 8} textAnchor="end" fontSize={9.5} className="fill-muted">dashed = ideal · solid = remaining pts</text>
    </svg>
  );
}

export function Velocity({ points }: { points: VelocityPoint[] }) {
  const W = 520, H = 200, pad = { l: 34, r: 12, t: 12, b: 26 };
  if (points.length === 0) return <div className="text-sm text-slate-500">No sprints yet.</div>;
  const max = Math.max(1, ...points.map((p) => Math.max(p.planned, p.delivered)));
  const bw = (W - pad.l - pad.r) / points.length;
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const avg = points.length ? Math.round(points.reduce((a, p) => a + p.delivered, 0) / points.length) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Velocity per sprint">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)}  className="stroke-border" />
          <text x={pad.l - 6} y={y(max * t) + 4} textAnchor="end" fontSize={10} className="fill-muted">{Math.round(max * t)}</text>
        </g>
      ))}
      {points.map((p, i) => {
        const x0 = pad.l + i * bw;
        const w = Math.max(6, bw * 0.28);
        return (
          <g key={p.sprint}>
            <rect x={x0 + bw * 0.2} y={y(p.planned)} width={w} height={y(0) - y(p.planned)} rx={2}  className="fill-border-2" />
            <rect x={x0 + bw * 0.2 + w + 3} y={y(p.delivered)} width={w} height={y(0) - y(p.delivered)} rx={2}  className="fill-accent" />
            <text x={x0 + bw / 2} y={H - 8} textAnchor="middle" fontSize={10} className="fill-muted">S{p.sprint}</text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={y(avg)} y2={y(avg)} strokeDasharray="3 3"  className="stroke-warn" />
      <text x={W - pad.r} y={y(avg) - 4} textAnchor="end" fontSize={9.5} className="fill-warn">avg {avg} pts</text>
      <text x={W - pad.r} y={pad.t + 8} textAnchor="end" fontSize={9.5} className="fill-muted">grey = planned · teal = delivered</text>
    </svg>
  );
}
