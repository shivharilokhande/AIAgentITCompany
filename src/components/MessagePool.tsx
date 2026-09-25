// src/components/MessagePool.tsx
// Publish / subscribe table (SOP-2) and the SOP list, plus a small SVG of the pool flow.
import type { PoolRule, SopDef } from "@/lib/types";
import { Card } from "./ui";

export function MessagePool({ pool, sops }: { pool: PoolRule[]; sops: SopDef[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card title="SOP-2 · Shared message pool — who publishes, who subscribes" className="lg:col-span-3">
        <PoolDiagram pool={pool} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="pb-2 pr-3">Role</th>
                <th className="pb-2 pr-3">Publishes</th>
                <th className="pb-2">Subscribes to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {pool.map((r) => (
                <tr key={r.role} className="align-top">
                  <td className="py-2 pr-3 font-medium text-slate-100">{r.role}</td>
                  <td className="py-2 pr-3">
                    {r.publishes.map((p) => (
                      <span key={p} className="mono mr-1 mb-1 inline-block rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent">{p}</span>
                    ))}
                  </td>
                  <td className="py-2">
                    {r.subscribes.map((p) => (
                      <span key={p} className="mono mr-1 mb-1 inline-block rounded bg-ink-700 px-1.5 py-0.5 text-[11px] text-slate-300">{p}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="The 10 SOPs (Code = SOP(Team))" className="lg:col-span-2">
        <ol className="space-y-2">
          {sops.map((s) => (
            <li key={s.id} className="rounded-lg border border-ink-600/60 bg-ink-800 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  <span className="text-accent">{s.id}</span> · {s.title}
                </span>
                <span className="text-[10px] text-slate-500">{s.phases.length ? `Phases ${s.phases.join(",")}` : "—"}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{s.oneLine}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function PoolDiagram({ pool }: { pool: PoolRule[] }) {
  const W = 760, H = 250;
  const cx = W / 2, cy = H / 2;
  const n = pool.length;
  const rx = 300, ry = 95;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Message pool diagram">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z"  className="fill-accent" />
        </marker>
      </defs>
      <ellipse cx={cx} cy={cy} rx={120} ry={40} strokeWidth={1.5}  className="fill-accent/15 stroke-accent" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-fg">Shared Message Pool</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize={10} className="fill-muted">product dir + state file</text>
      {pool.map((r, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
        const ix = cx + 122 * Math.cos(a), iy = cy + 42 * Math.sin(a);
        const ox = cx + (rx - 62) * Math.cos(a), oy = cy + (ry - 18) * Math.sin(a);
        return (
          <g key={r.role}>
            <line x1={ox} y1={oy} x2={ix} y2={iy} strokeWidth={1.2} markerEnd="url(#arr)" opacity={0.8}  className="stroke-accent" />
            <line x1={ix + 6 * Math.sin(a)} y1={iy - 6 * Math.cos(a)} x2={ox + 6 * Math.sin(a)} y2={oy - 6 * Math.cos(a)} strokeWidth={1} strokeDasharray="3 3" markerEnd="url(#arr)" opacity={0.7}  className="stroke-muted" />
            <rect x={x - 62} y={y - 14} width={124} height={28} rx={8}  className="fill-surface-2 stroke-border-2" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-fg">{r.role}</text>
          </g>
        );
      })}
      <text x={10} y={H - 8} fontSize={9.5} className="fill-muted">solid = publish · dashed = subscribe</text>
    </svg>
  );
}
