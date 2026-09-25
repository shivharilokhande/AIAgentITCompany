"use client";
// src/components/LiveOrgChart.tsx — org chart that polls the project's running command and animates the working persona.
import { useEffect, useState } from "react";
import type { Activity, Persona } from "@/lib/types";
import { OrgChart, type LivePersona } from "./OrgChart";
import { STEP_META } from "./RunView";

export function LiveOrgChart({ projectId, personas, highlight, initialLive }: { projectId: string; personas: Persona[]; highlight: string[]; initialLive: LivePersona | null }) {
  const [live, setLive] = useState<LivePersona | null>(initialLive);
  const [counts, setCounts] = useState<Record<string, number> | undefined>(undefined);
  useEffect(() => {
    const tick = async () => {
      try {
        const c = await fetch(`/api/bridge/commands?status=running&project=${projectId}&limit=1`, { cache: "no-store" }).then((r) => r.json());
        const cmd = c.commands?.[0];
        if (!cmd) { setLive(null); setCounts(undefined); return; }
        const a = await fetch(`/api/bridge/activity?command=${cmd.id}&limit=300`, { cache: "no-store" }).then((r) => r.json());
        const acts: Activity[] = a.activity ?? [];
        const last = acts[acts.length - 1];
        setLive(last?.persona ? { persona: last.persona, label: STEP_META[last.step ?? ""].label || "Working", message: last.message } : null);
        setCounts(acts.reduce<Record<string, number>>((acc, x) => { if (x.persona) acc[x.persona] = (acc[x.persona] ?? 0) + 1; return acc; }, {}));
      } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [projectId]);
  return <OrgChart personas={personas} highlight={live ? [] : highlight} live={live} counts={counts} />;
}
