// src/components/LanesBar.tsx — parallel-lane capacity strip above the kanban with the Scrum Master's Dispatch button.
import Link from "next/link";
import { dispatchAction } from "@/lib/actions";
import { ActionForm, SubmitButton, Icon } from "./system";
import { Badge } from "./ui";

export function LanesBar({ projectId, sprintId, lanes, inProgress, todo, free }: { projectId: string; sprintId: string; lanes: number; inProgress: number; todo: number; free: Array<{ name: string; free: number }> }) {
  const idle = free.reduce((a, f) => a + f.free, 0);
  const can = Math.min(idle, todo);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon name="users" className="h-4 w-4 text-accent" />
        <span className="font-semibold text-fg">Parallel lanes</span>
        <div className="flex gap-0.5" aria-label={`${inProgress} of ${lanes} lanes busy`}>
          {Array.from({ length: lanes }).map((_, i) => <span key={i} className={`h-3 w-2 rounded-sm ${i < inProgress ? "bg-accent" : "bg-border-2"}`} />)}
        </div>
        <span className="text-muted">{inProgress}/{lanes} busy</span>
      </div>
      <div className="flex flex-wrap gap-1 text-[11px]">
        {free.length === 0 ? <Badge tone="warn">all engineers at capacity</Badge> : free.map((f) => <Badge key={f.name} tone="good">{f.name.split(" ")[0]} · {f.free} free</Badge>)}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/team" className="btn-ghost btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> Hire / capacity</Link>
        <ActionForm action={dispatchAction} success={can > 0 ? `Dispatched ${can} stor${can === 1 ? "y" : "ies"} — Claude will build them in parallel` : "Nothing to dispatch"}>
          <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="sprintId" value={sprintId} />
          <SubmitButton className="btn-primary btn-sm" pendingText="Dispatching…" disabled={can === 0}><Icon name="bolt" className="h-3.5 w-3.5" /> Dispatch {can > 0 ? `${can} to idle lanes` : ""}</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
