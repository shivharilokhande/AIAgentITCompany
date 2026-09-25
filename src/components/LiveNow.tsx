"use client";
// src/components/LiveNow.tsx — strip on the Pipeline tab: who is working right now on which command, live.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Activity, Command, Persona, PhaseDef } from "@/lib/types";
import { Avatar, Badge } from "./ui";
import { Icon, Spinner } from "./system";
import { STEP_META } from "./RunView";

export function LiveNow({ projectId, command: initial, lastStep: initialStep, personas, phases }: { projectId: string; command: Command | null; lastStep: Activity | null; personas: Persona[]; phases: PhaseDef[] }) {
  const [command, setCommand] = useState(initial);
  const [step, setStep] = useState(initialStep);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        fetch("/api/bridge/tick", { method: "POST" }).catch(() => {});
        const c = await fetch(`/api/bridge/commands?status=running&project=${projectId}&limit=1`, { cache: "no-store" }).then((r) => r.json());
        const cmd: Command | null = c.commands?.[0] ?? null;
        setCommand(cmd);
        if (cmd) {
          const a = await fetch(`/api/bridge/activity?command=${cmd.id}&limit=1`, { cache: "no-store" }).then((r) => r.json());
          setStep(a.activity?.[0] ?? null);
        } else setStep(null);
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(t);
  }, [projectId]);
  if (!command) return null;
  const p = personas.find((x) => x.id === step?.persona);
  const m = STEP_META[step?.step ?? ""];
  return (
    <Link href={`/projects/${projectId}/runs/${command.id}`} className="card flex flex-wrap items-center gap-3 border-accent/40 bg-accent/5 p-3 hover:bg-accent/10">
      <Spinner className="h-4 w-4 text-accent" />
      {p ? <Avatar name={p.name} size={28} /> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-fg">{p ? `${p.name} · ${p.role}` : "Company"} <span className="font-normal text-muted">is working on</span> “{command.text}”</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          {step?.step && <Badge tone={m.tone}><Icon name={m.icon} className="h-3 w-3" /> {m.label}</Badge>}
          {step?.phase && <span>Phase {step.phase} — {phases.find((x) => x.n === step.phase)?.name}</span>}
          {step && <span className="truncate">{step.message}</span>}
        </div>
      </div>
      <span className="text-xs text-accent">Open company run →</span>
    </Link>
  );
}
