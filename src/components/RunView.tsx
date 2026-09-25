"use client";
// src/components/RunView.tsx
// Live "company run": one command flowing through the 8 phases. Shows which persona is on the field,
// what kind of work they are doing (think / analyze / decide / write / design / code / review / test / deploy / deliver),
// and every step with expandable detail (reasoning, code, test output). Polls while the command is running.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Activity, Command, PhaseDef, Persona, StepKind } from "@/lib/types";
import { Avatar, Badge, Card, Empty } from "./ui";
import { Icon, Spinner } from "./system";
import { OrgChart } from "./OrgChart";

export const STEP_META: Record<StepKind | "", { label: string; icon: string; tone: string }> = {
  ask: { label: "Asked", icon: "send", tone: "accent" },
  think: { label: "Thinking", icon: "spark", tone: "info" },
  analyze: { label: "Analyzing", icon: "search", tone: "info" },
  decide: { label: "Decided", icon: "check", tone: "accent" },
  write: { label: "Writing", icon: "doc", tone: "neutral" },
  design: { label: "Designing", icon: "grid", tone: "neutral" },
  code: { label: "Coding", icon: "bolt", tone: "warn" },
  review: { label: "Reviewing", icon: "shield", tone: "warn" },
  test: { label: "Testing", icon: "shield", tone: "warn" },
  deploy: { label: "Deploying", icon: "refresh", tone: "good" },
  deliver: { label: "Delivered", icon: "check", tone: "good" },
  note: { label: "Note", icon: "doc", tone: "neutral" },
  "": { label: "", icon: "doc", tone: "neutral" },
};

export function RunView({ command: initialCommand, activity: initialActivity, phases, personas, projectId }: { command: Command; activity: Activity[]; phases: PhaseDef[]; personas: Persona[]; projectId: string }) {
  const [command, setCommand] = useState(initialCommand);
  const [activity, setActivity] = useState(initialActivity);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const seqRef = useRef(initialActivity.reduce((m, a) => Math.max(m, a.seq), 0));
  const live = command.status === "running" || command.status === "queued";

  const refresh = useCallback(async () => {
    try {
      fetch("/api/bridge/tick", { method: "POST" }).catch(() => {});
      const a = await fetch(`/api/bridge/activity?command=${command.id}&since=${seqRef.current}&limit=200`, { cache: "no-store" }).then((r) => r.json());
      if (a.activity?.length) { seqRef.current = Math.max(seqRef.current, ...a.activity.map((x: Activity) => x.seq)); setActivity((prev) => [...prev, ...a.activity]); }
      const c = await fetch(`/api/bridge/commands/${command.id}`, { cache: "no-store" }).then((r) => r.json());
      if (c.command) setCommand(c.command);
    } catch { /* keep state */ }
  }, [command.id]);
  useEffect(() => { if (!live) return; const t = setInterval(refresh, 2500); return () => clearInterval(t); }, [live, refresh]);

  const byId = (id: string) => personas.find((p) => p.id === id);
  const last = activity[activity.length - 1];
  const currentPhase = live ? (last?.phase ?? 1) : 8;
  const currentPersona = live ? byId(last?.persona ?? "") : undefined;
  const phaseGroups = useMemo(() => {
    const g = new Map<number, Activity[]>();
    for (const a of activity) { const k = a.phase ?? 0; if (!g.has(k)) g.set(k, []); g.get(k)!.push(a); }
    return g;
  }, [activity]);
  const touched = new Set(activity.map((a) => a.phase).filter((p): p is number => !!p));
  const stepCounts = activity.reduce<Record<string, number>>((acc, a) => { if (a.step) acc[a.step] = (acc[a.step] ?? 0) + 1; return acc; }, {});
  const personasInvolved = Array.from(new Set(activity.map((a) => a.persona).filter(Boolean)));
  const tone = { queued: "warn", running: "info", done: "good", failed: "bad" }[command.status] as "warn" | "info" | "good" | "bad";
  const personaCounts = activity.reduce<Record<string, number>>((acc, a) => { if (a.persona) acc[a.persona] = (acc[a.persona] ?? 0) + 1; return acc; }, {});
  const liveInfo = live && currentPersona && last ? { persona: currentPersona.id, label: STEP_META[last.step ?? ""].label || "Working", message: last.message } : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted"><Link href={`/projects/${projectId}/claude`} className="hover:text-accent">← All runs</Link><span>·</span><span>{command.kind}</span><span>·</span><span>{command.source}</span><span>·</span><span>{new Date(command.createdAt).toLocaleString()}</span></div>
            <h2 className="mt-1 text-lg font-semibold text-fg">{command.text}</h2>
          </div>
          <Badge tone={tone} className="text-xs">{command.status === "running" ? <><Spinner className="h-3 w-3" /> running</> : command.status}</Badge>
        </div>
        {/* Who is on the field */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-2 p-3">
          {live && currentPersona ? (
            <>
              <Avatar name={currentPersona.name} size={36} />
              <div>
                <div className="text-sm font-semibold text-fg">{currentPersona.name} <span className="font-normal text-muted">· {currentPersona.role}</span></div>
                <div className="flex items-center gap-2 text-xs text-muted"><Badge tone={STEP_META[last?.step ?? ""].tone}><Icon name={STEP_META[last?.step ?? ""].icon} className="h-3 w-3" /> {STEP_META[last?.step ?? ""].label || "working"}</Badge> Phase {currentPhase} — {phases.find((p) => p.n === currentPhase)?.name}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">{command.status === "queued" ? "Waiting for Claude to pick this up…" : `${personasInvolved.length} personas took part · ${activity.length} steps`}</div>
          )}
          <div className="ml-auto flex flex-wrap gap-1">
            {Object.entries(stepCounts).map(([k, v]) => <Badge key={k} tone={STEP_META[k as StepKind].tone}>{STEP_META[k as StepKind].label} {v}</Badge>)}
          </div>
        </div>
      </Card>

      {/* Who is working — live org chart */}
      <Card title={<span className="flex items-center gap-2">Who is working right now {live && <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />}</span>} right={<span className="text-xs text-muted">{live ? "glowing = working now · numbers = steps so far · dimmed = not involved yet" : "numbers = steps each persona contributed"}</span>}>
        <OrgChart personas={personas} live={liveInfo} counts={personaCounts} />
      </Card>

      {/* Phase rail */}
      <ol className="grid grid-cols-8 gap-2">
        {phases.map((ph) => {
          const done = touched.has(ph.n) && (!live || ph.n < currentPhase);
          const active = live && ph.n === currentPhase;
          const n = phaseGroups.get(ph.n)?.length ?? 0;
          return (
            <li key={ph.n} className={`rounded-xl border p-2.5 ${active ? "border-accent bg-accent/5" : done ? "border-good/40 bg-surface" : "border-border bg-surface opacity-70"}`}>
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-good text-white" : active ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>{done ? "✓" : ph.n}</span>
                {active && <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />}
                {n > 0 && !active && <span className="text-[10px] text-muted">{n}</span>}
              </div>
              <div className="mt-1 truncate text-[11px] font-semibold text-fg">{ph.name}</div>
              <div className="mt-1 flex -space-x-1">{ph.leads.slice(0, 4).map((id) => { const p = byId(id); return p ? <Avatar key={id} name={p.name} size={16} /> : null; })}</div>
            </li>
          );
        })}
      </ol>

      {/* Timeline */}
      <Card title="Company run — every step, by phase and persona">
        {activity.length === 0 ? <Empty>No steps yet.</Empty> : (
          <div className="space-y-5">
            {Array.from(phaseGroups.entries()).sort((a, b) => a[0] - b[0]).map(([ph, items]) => {
              const def = phases.find((p) => p.n === ph);
              return (
                <section key={ph}>
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {def ? <><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[10px] text-fg">{ph}</span> {def.name}</> : "General"}
                  </h4>
                  <ol className="space-y-2 border-l border-border pl-4">
                    {items.map((a) => {
                      const p = byId(a.persona);
                      const m = STEP_META[a.step];
                      const isOpen = open[a.id];
                      return (
                        <li key={a.id} className="relative animate-fadein">
                          <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-border-2" />
                          <div className="flex items-start gap-2">
                            {p ? <Avatar name={p.name} size={26} /> : <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-surface-2 text-muted"><Icon name="bolt" className="h-3.5 w-3.5" /></span>}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                                <span className="font-semibold text-fg">{p ? p.name : a.actor}</span>{p && <span>· {p.role}</span>}
                                {a.step && <Badge tone={m.tone}><Icon name={m.icon} className="h-3 w-3" /> {m.label}</Badge>}
                                <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-sm text-fg">{a.message}</div>
                              {a.detail && (
                                <button type="button" onClick={() => setOpen((o) => ({ ...o, [a.id]: !o[a.id] }))} className="mt-1 text-[11px] text-accent hover:underline">{isOpen ? "Hide detail" : "Show detail"}</button>
                              )}
                              {isOpen && a.detail && <pre className="mono mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-[11px] leading-5 text-fg-2">{a.detail}</pre>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
        {command.result && (
          <div className="mt-5 rounded-lg border border-good/30 bg-good/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-good"><Icon name="check" className="h-3.5 w-3.5" /> Delivery (Founder)</div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-fg">{command.result}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
