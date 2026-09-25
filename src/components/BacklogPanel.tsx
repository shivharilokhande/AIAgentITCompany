// src/components/BacklogPanel.tsx
// Requirement pool (P0/P1/P2) + product backlog of user stories not yet in a sprint.
import { ActionForm } from "@/components/system";
import type { Requirement, UserStory, Sprint } from "@/lib/types";
import { addRequirementAction, deleteRequirementAction, updateRequirementAction, createStoryAction, updateStoryAction, deleteStoryAction } from "@/lib/actions";
import { Badge, Card, Empty } from "./ui";

export function RequirementPool({ projectId, requirements }: { projectId: string; requirements: Requirement[] }) {
  const counts = { P0: 0, P1: 0, P2: 0 } as Record<string, number>;
  for (const r of requirements) counts[r.priority]++;
  return (
    <Card
      title="Requirement Pool (Contract A)"
      right={
        <div className="flex gap-1">
          <Badge tone="P0">P0 · {counts.P0}</Badge>
          <Badge tone="P1">P1 · {counts.P1}</Badge>
          <Badge tone="P2">P2 · {counts.P2}</Badge>
        </div>
      }
    >
      <p className="mb-3 text-xs text-slate-400">P0 = must ship in v1 (defines the MVP). P1 = should. P2 = v2. CFO checks P0 count ≤ sprint budget.</p>
      {requirements.length === 0 ? (
        <Empty>No requirements yet. Add the top 5–7.</Empty>
      ) : (
        <ul className="divide-y divide-ink-700">
          {requirements.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <ActionForm action={updateRequirementAction} className="contents">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="id" value={r.id} />
                <select name="priority" defaultValue={r.priority} className="input w-20 py-1" onChange={undefined}>
                  <option>P0</option>
                  <option>P1</option>
                  <option>P2</option>
                </select>
                <button className="btn-ghost px-2 py-1 text-xs" type="submit">set</button>
              </ActionForm>
              <span className="flex-1 text-sm text-slate-100">{r.text}</span>
              <ActionForm action={deleteRequirementAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="id" value={r.id} />
                <button className="text-xs text-slate-500 hover:text-bad" type="submit" aria-label="Delete requirement">✕</button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addRequirementAction} success="Added" resetOnSuccess className="mt-3 flex gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <select name="priority" className="input w-24" defaultValue="P0">
          <option>P0</option>
          <option>P1</option>
          <option>P2</option>
        </select>
        <input name="text" className="input" placeholder="Requirement…" required />
        <button className="btn-primary shrink-0" type="submit">Add</button>
      </ActionForm>
    </Card>
  );
}

export function StoryBacklog({ projectId, stories, sprints }: { projectId: string; stories: UserStory[]; sprints: Sprint[] }) {
  const backlog = stories.filter((s) => !s.sprintId);
  const total = backlog.reduce((a, s) => a + s.points, 0);
  return (
    <Card title="Product Backlog (user stories not in a sprint)" right={<Badge tone="accent">{backlog.length} stories · {total} pts</Badge>}>
      {backlog.length === 0 ? (
        <Empty>Backlog is empty. Every story is planned into a sprint.</Empty>
      ) : (
        <ul className="divide-y divide-ink-700">
          {backlog.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="flex-1 text-sm text-slate-100">
                {s.title}
                {s.description && <span className="block text-xs text-slate-400">{s.description}</span>}
              </span>
              <Badge>{s.points} pts</Badge>
              <ActionForm action={updateStoryAction} className="flex items-center gap-1">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="storyId" value={s.id} />
                <select name="sprintId" className="input w-40 py-1" defaultValue="">
                  <option value="">— move to sprint —</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>Sprint {sp.number} ({sp.status})</option>
                  ))}
                </select>
                <button className="btn-ghost px-2 py-1 text-xs" type="submit">Plan</button>
              </ActionForm>
              <ActionForm action={deleteStoryAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="storyId" value={s.id} />
                <button className="text-xs text-slate-500 hover:text-bad" type="submit" aria-label="Delete story">✕</button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={createStoryAction} success="Added" resetOnSuccess className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="title" className="input" placeholder="As a <role>, I want <capability>…" required />
        <input name="description" className="input" placeholder="so that <outcome> / acceptance criteria" />
        <input name="points" type="number" min={0} max={40} defaultValue={3} className="input" aria-label="Points" />
        <button className="btn-primary" type="submit">Add story</button>
      </ActionForm>
    </Card>
  );
}
