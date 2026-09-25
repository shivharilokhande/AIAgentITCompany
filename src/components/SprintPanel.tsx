// src/components/SprintPanel.tsx
// Sprint list: create, activate, close, pick which one the board shows.
import { ActionForm } from "@/components/system";
import Link from "next/link";
import type { Sprint, UserStory } from "@/lib/types";
import { createSprintAction, updateSprintAction, deleteSprintAction } from "@/lib/actions";
import { Badge, Card } from "./ui";

export function SprintPanel({ projectId, sprints, stories, selectedId }: { projectId: string; sprints: Sprint[]; stories: UserStory[]; selectedId: string | null }) {
  const tone = { planned: "neutral", active: "accent", closed: "good" } as const;
  return (
    <Card title="Sprints" right={<Badge tone="accent">{sprints.length}</Badge>}>
      <ul className="space-y-2">
        {sprints.map((sp) => {
          const inSprint = stories.filter((s) => s.sprintId === sp.id);
          const pts = inSprint.reduce((a, s) => a + s.points, 0);
          const done = inSprint.filter((s) => s.status === "done").reduce((a, s) => a + s.points, 0);
          const sel = sp.id === selectedId;
          return (
            <li key={sp.id} className={`rounded-lg border p-3 ${sel ? "border-accent bg-ink-800" : "border-ink-600/60 bg-ink-800/50"}`}>
              <div className="flex items-center justify-between gap-2">
                <Link href={`/projects/${projectId}/scrum?sprint=${sp.id}`} className="text-sm font-semibold text-slate-100 hover:text-accent">
                  Sprint {sp.number}
                </Link>
                <Badge tone={tone[sp.status]}>{sp.status}</Badge>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{sp.goal || "—"}</div>
              <div className="mt-1 text-[11px] text-slate-500">{sp.startDate} → {sp.endDate} · {done}/{pts} pts done</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {sp.status !== "active" && (
                  <ActionForm action={updateSprintAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="sprintId" value={sp.id} />
                    <input type="hidden" name="status" value="active" />
                    <button className="btn-ghost px-2 py-0.5 text-[11px]" type="submit">Activate</button>
                  </ActionForm>
                )}
                {sp.status === "active" && (
                  <ActionForm action={updateSprintAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="sprintId" value={sp.id} />
                    <input type="hidden" name="status" value="closed" />
                    <button className="btn-ghost px-2 py-0.5 text-[11px]" type="submit">Close</button>
                  </ActionForm>
                )}
                <ActionForm action={deleteSprintAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="sprintId" value={sp.id} />
                  <button className="btn-danger px-2 py-0.5 text-[11px]" type="submit">Delete</button>
                </ActionForm>
              </div>
            </li>
          );
        })}
      </ul>
      <ActionForm action={createSprintAction} success="Added" resetOnSuccess className="mt-3 space-y-2 border-t border-ink-700 pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="goal" className="input" placeholder="Sprint goal" />
        <div className="grid grid-cols-2 gap-2">
          <input name="startDate" type="date" className="input" aria-label="Start date" />
          <input name="endDate" type="date" className="input" aria-label="End date" />
        </div>
        <button className="btn-primary w-full" type="submit">+ New sprint</button>
      </ActionForm>
    </Card>
  );
}
