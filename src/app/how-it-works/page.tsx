import { PIPELINE } from "@/lib/pipeline";
import { OrgChart } from "@/components/OrgChart";
import { MessagePool } from "@/components/MessagePool";
import { PipelineView } from "@/components/PipelineView";
import { Card } from "@/components/ui";
import type { PhaseState } from "@/lib/types";

export default function HowItWorks() {
  const demoState: PhaseState[] = PIPELINE.phases.map((p) => ({ projectId: "demo", phase: p.n, status: p.n < 5 ? "done" : p.n === 5 ? "active" : "pending", summary: "", completedAt: null }));
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-widest text-accent">Smart IT by Shiv</div>
        <h1 className="text-2xl font-bold text-slate-50">How the company works</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          One rule: the user gives an idea, the company delivers the product, nobody asks the user anything. The org chart says <em>who</em>; the 8 phases say <em>when</em>;
          the SOP layer says <em>what shape every handoff must have</em>.
        </p>
      </header>
      <Card title="1 · The team — 15 personas in 5 layers">
        <OrgChart personas={PIPELINE.personas} />
      </Card>
      <Card title="2 · The 8 phases (click a phase to see owners, deliverables and SOPs)">
        <PipelineView projectId="demo" phases={PIPELINE.phases} personas={PIPELINE.personas} sops={PIPELINE.sops} state={demoState} readOnly />
      </Card>
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-50">3 · The SOP layer — how information moves</h2>
        <MessagePool pool={PIPELINE.pool} sops={PIPELINE.sops} />
      </div>
      <Card title="4 · Inside Phase 5 — the coding loop per file">
        <ol className="grid gap-3 text-sm md:grid-cols-5">
          {[
            ["Pick next file", "Task List order (Contract C). Leaf modules first, entry point last."],
            ["Assemble context", "Design (B) · Task row (C) · legacy code it imports · debug logs · open TODOs. Nothing else (SOP-2)."],
            ["Write ONE complete file", "SOP-3: no stubs, defaults + types, only public members from the classDiagram."],
            ["Review: 6 questions", "SOP-4: requirements? logic? follows design? all implemented? imports? reuse? → LGTM or LBTM. Max k=2."],
            ["End of sprint", "SOP-5: run → debug (≤3/file) → CODE_SUMMARY → is-pass YES/NO. NO → TODOs open next iteration."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-lg border border-ink-600/60 bg-ink-800 p-3">
              <div className="text-xs font-bold text-accent">STEP {i + 1}</div>
              <div className="mt-1 font-semibold text-slate-100">{t}</div>
              <p className="mt-1 text-xs text-slate-400">{d}</p>
            </li>
          ))}
        </ol>
      </Card>
      <Card title="5 · Quality gate — 10 checks, in order">
        <ol className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.gate.map((g) => (
            <li key={g.n} className="rounded-lg border border-ink-600/60 bg-ink-800 p-3">
              <div className="text-xs font-bold text-accent">CHECK {g.n}</div>
              <div className="font-semibold text-slate-100">{g.name}</div>
              <p className="mt-1 text-xs text-slate-400">{g.what}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
