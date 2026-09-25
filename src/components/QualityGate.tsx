// src/components/QualityGate.tsx
// Divya's 10-check pipeline (Phase 6).
import { ActionForm } from "@/components/system";
import type { GateCheck, GateCheckDef } from "@/lib/types";
import { setGateAction } from "@/lib/actions";
import { gateScore } from "@/lib/metrics";
import { Badge, Card, ProgressBar } from "./ui";

export function QualityGate({ projectId, defs, checks }: { projectId: string; defs: GateCheckDef[]; checks: GateCheck[] }) {
  const score = gateScore(checks);
  const failed = checks.filter((c) => c.status === "fail").length;
  return (
    <Card title="Phase 6 · Quality Gate (10 checks, in order)" right={<Badge tone={score === 100 ? "good" : failed ? "bad" : "warn"}>{score}% · {failed} failing</Badge>}>
      <ProgressBar value={score} tone={score === 100 ? "good" : failed ? "bad" : "warn"} />
      <ul className="mt-3 divide-y divide-ink-700">
        {defs.map((d) => {
          const c = checks.find((x) => x.check === d.n);
          const st = c?.status ?? "pending";
          return (
            <li key={d.n} className="flex flex-wrap items-center gap-3 py-2">
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${st === "pass" ? "bg-good text-white" : st === "fail" ? "bg-bad text-white" : "bg-ink-700 text-slate-400"}`}>
                {st === "pass" ? "✓" : st === "fail" ? "✕" : d.n}
              </span>
              <div className="min-w-[180px] flex-1">
                <div className="text-sm font-medium text-slate-100">{d.name}</div>
                <div className="text-xs text-slate-400">{d.what}</div>
                {c?.note && <div className="mt-0.5 text-xs text-accent">{c.note}</div>}
              </div>
              <ActionForm action={setGateAction} className="flex items-center gap-1">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="check" value={d.n} />
                <input name="note" className="input w-44 py-1 text-xs" placeholder="note" defaultValue={c?.note ?? ""} />
                <button className="btn-ghost px-2 py-1 text-xs text-good" name="status" value="pass" type="submit">pass</button>
                <button className="btn-ghost px-2 py-1 text-xs text-bad" name="status" value="fail" type="submit">fail</button>
                <button className="btn-ghost px-2 py-1 text-xs" name="status" value="pending" type="submit">reset</button>
              </ActionForm>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
