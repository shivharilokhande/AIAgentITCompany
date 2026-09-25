// src/components/AdrList.tsx
import { ActionForm } from "@/components/system";
import type { Adr, Project } from "@/lib/types";
import { addAdrAction, deleteAdrAction, setDeployAction } from "@/lib/actions";
import { Badge, Card, Empty } from "./ui";

export function AdrList({ projectId, adrs }: { projectId: string; adrs: Adr[] }) {
  return (
    <Card title="Architecture Decision Records" right={<Badge tone="accent">{adrs.length}</Badge>}>
      {adrs.length === 0 ? <Empty>No ADRs yet. Record every non-obvious decision.</Empty> : (
        <ul className="space-y-2">
          {adrs.map((a, i) => (
            <li key={a.id} className="rounded-lg border border-ink-600/60 bg-ink-800 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-100"><span className="text-accent">ADR-{String(i + 1).padStart(3, "0")}</span> · {a.title}</div>
                  <p className="mt-1 text-xs text-slate-300">{a.decision}</p>
                </div>
                <ActionForm action={deleteAdrAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-slate-500 hover:text-bad" type="submit" aria-label="Delete ADR">✕</button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addAdrAction} success="Added" resetOnSuccess className="mt-3 space-y-2 border-t border-ink-700 pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="title" className="input" placeholder="Title — e.g. SQLite over Postgres" required />
        <textarea name="decision" rows={2} className="input" placeholder="Context → Decision → Consequences" required />
        <button className="btn-primary" type="submit">Record ADR</button>
      </ActionForm>
    </Card>
  );
}

export function DeployCard({ project }: { project: Project }) {
  const tone = { not_deployed: "neutral", staging: "warn", production: "good" } as const;
  return (
    <Card title="Phase 7 · Deployment status" right={<Badge tone={tone[project.deployStatus]}>{project.deployStatus.replace("_", " ")}</Badge>}>
      <p className="mb-3 text-xs text-slate-400">Pinned packages from Contract C flow into Dockerfile / manifests. Update when DevOps ships.</p>
      <ActionForm action={setDeployAction} className="flex gap-2">
        <input type="hidden" name="projectId" value={project.id} />
        {(["not_deployed", "staging", "production"] as const).map((s) => (
          <button key={s} className={`btn-ghost text-xs ${project.deployStatus === s ? "border-accent text-accent" : ""}`} name="status" value={s} type="submit">
            {s.replace("_", " ")}
          </button>
        ))}
      </ActionForm>
    </Card>
  );
}
