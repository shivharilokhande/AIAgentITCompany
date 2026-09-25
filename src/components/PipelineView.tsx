"use client";
// src/components/PipelineView.tsx
// Interactive 8-phase stepper. Joins the static PIPELINE model with per-project PhaseState.
import { ActionForm } from "@/components/system";
import { useState } from "react";
import type { PhaseState, PhaseDef, Persona, SopDef } from "@/lib/types";
import { setPhaseAction } from "@/lib/actions";
import { Avatar, Badge } from "./ui";

type Props = {
  projectId: string;
  phases: PhaseDef[];
  personas: Persona[];
  sops: SopDef[];
  state: PhaseState[];
  readOnly?: boolean;
};

const statusTone = { pending: "neutral", active: "accent", done: "good" } as const;

export function PipelineView({ projectId, phases, personas, sops, state, readOnly }: Props) {
  const active = state.find((s) => s.status === "active")?.phase ?? (state.every((s) => s.status === "done") ? 8 : 1);
  const [selected, setSelected] = useState<number>(active);
  const byId = (id: string) => personas.find((p) => p.id === id);
  const sopById = (id: string) => sops.find((s) => s.id === id);
  const sel = phases.find((p) => p.n === selected)!;
  const selState = state.find((s) => s.phase === selected);

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <ol className="grid grid-cols-8 gap-2">
        {phases.map((ph) => {
          const st = state.find((s) => s.phase === ph.n)?.status ?? "pending";
          const isSel = ph.n === selected;
          return (
            <li key={ph.n}>
              <button
                type="button"
                onClick={() => setSelected(ph.n)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSel ? "border-accent bg-ink-800" : "border-ink-600/60 bg-ink-900 hover:bg-ink-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      st === "done" ? "bg-good text-white" : st === "active" ? "bg-accent text-white" : "bg-ink-700 text-slate-400"
                    }`}
                  >
                    {st === "done" ? "✓" : ph.n}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${st === "active" ? "animate-pulse bg-accent" : st === "done" ? "bg-good" : "bg-ink-600"}`} />
                </div>
                <div className="mt-2 truncate text-xs font-semibold text-slate-100">{ph.name}</div>
                <div className="mt-2 flex -space-x-1.5">
                  {ph.leads.slice(0, 4).map((id) => {
                    const p = byId(id);
                    return p ? <Avatar key={id} name={p.name} size={20} /> : null;
                  })}
                  {ph.leads.length > 4 && <span className="ml-2 text-[10px] text-slate-400">+{ph.leads.length - 4}</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Connector line */}
      <div className="relative h-1 rounded-full bg-ink-700">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-good transition-all"
          style={{ width: `${(state.filter((s) => s.status === "done").length / 8) * 100}%` }}
        />
      </div>

      {/* Detail */}
      <div className="card grid gap-4 p-5 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Badge tone={statusTone[selState?.status ?? "pending"]}>{selState?.status ?? "pending"}</Badge>
            <h3 className="text-lg font-semibold text-slate-50">
              Phase {sel.n} — {sel.name}
            </h3>
          </div>
          <p className="mt-2 text-sm text-slate-300">{sel.summary}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label">Owned by</div>
              <ul className="space-y-1.5">
                {sel.leads.map((id) => {
                  const p = byId(id);
                  if (!p) return null;
                  return (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <Avatar name={p.name} size={22} />
                      <span className="text-slate-100">{p.name}</span>
                      <span className="text-slate-500">· {p.role}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <div className="label">Deliverables (published to the pool)</div>
              <ul className="space-y-1">
                {sel.deliverables.map((d) => (
                  <li key={d} className="mono text-xs text-accent">{d}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <div className="label">SOPs that fire here</div>
            <div className="flex flex-wrap gap-2">
              {sel.sops.map((id) => {
                const s = sopById(id);
                return s ? (
                  <span key={id} title={s.oneLine} className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-slate-200">
                    <span className="font-semibold text-accent">{s.id}</span> {s.title}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          {selState?.summary && (
            <div className="mt-4 rounded-lg border border-ink-600 bg-ink-800 p-3 text-sm text-slate-200">
              <div className="label">Project note</div>
              {selState.summary}
              {selState.completedAt && <div className="mt-1 text-xs text-slate-500">Completed {new Date(selState.completedAt).toLocaleString()}</div>}
            </div>
          )}
        </div>

        {!readOnly && (
          <ActionForm action={setPhaseAction} className="space-y-3 rounded-lg border border-ink-600 bg-ink-800 p-4">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="phase" value={sel.n} />
            <div>
              <label className="label" htmlFor="summary">Phase summary (shown in status)</label>
              <textarea id="summary" name="summary" defaultValue={selState?.summary ?? ""} rows={4} className="input" placeholder="e.g. 3 must-haves, 2 v2 items" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" name="status" value="done" type="submit">Mark phase {sel.n} done →</button>
              <button className="btn-ghost" name="status" value="active" type="submit">Set active</button>
            </div>
            <p className="text-xs text-slate-500">Marking done activates phase {Math.min(8, sel.n + 1)} and completes everything before it. Setting active reopens this phase.</p>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
