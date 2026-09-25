"use client";
// src/components/KanbanBoard.tsx
// 4-column board with native HTML5 drag-and-drop (ADR-003). Each card also has a <select> for keyboard/touch.
import { ActionForm, Modal, Icon, SubmitButton } from "@/components/system";
import { useRef, useState, useTransition } from "react";
import type { UserStory, StoryStatus, Sprint } from "@/lib/types";
import { STORY_STATUSES, STORY_STATUS_LABEL } from "@/lib/types";
import { moveStoryAction, deleteStoryAction, createStoryAction, updateStoryAction } from "@/lib/actions";
import { Avatar, Badge } from "./ui";

export function KanbanBoard({ projectId, sprint, stories, sprints = [], team = [] }: { projectId: string; sprint: Sprint | null; stories: UserStory[]; sprints?: Sprint[]; team?: Array<{ id: string; name: string; role: string }> }) {
  const [over, setOver] = useState<StoryStatus | null>(null);
  const [editing, setEditing] = useState<UserStory | null>(null);
  const [pending, start] = useTransition();
  const dragId = useRef<string | null>(null);
  const [local, setLocal] = useState(stories);
  // keep local in sync when server data changes
  const key = stories.map((s) => s.id + s.status).join("|");
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) { setLocal(stories); setLastKey(key); }

  const move = (id: string, status: StoryStatus) => {
    setLocal((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("storyId", id);
    fd.set("status", status);
    start(() => { void moveStoryAction(fd); });
  };

  return (
    <div className={`grid gap-3 md:grid-cols-4 ${pending ? "opacity-90" : ""}`}>
      {STORY_STATUSES.map((col) => {
        const items = local.filter((s) => s.status === col);
        const pts = items.reduce((a, s) => a + s.points, 0);
        return (
          <section
            key={col}
            onDragOver={(e) => { e.preventDefault(); setOver(col); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragId.current ?? e.dataTransfer.getData("text/plain");
              if (id) move(id, col);
              dragId.current = null;
              setOver(null);
            }}
            className={`flex min-h-[320px] flex-col rounded-xl border p-3 transition-colors ${over === col ? "border-accent bg-ink-800" : "border-ink-600/60 bg-ink-900"}`}
          >
            <header className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">{STORY_STATUS_LABEL[col]}</h4>
              <Badge tone={col === "done" ? "good" : col === "review" ? "warn" : "neutral"}>{items.length} · {pts} pts</Badge>
            </header>
            <div className="flex-1 space-y-2">
              {items.map((s) => (
                <article
                  key={s.id}
                  draggable
                  onDragStart={(e) => { dragId.current = s.id; e.dataTransfer.setData("text/plain", s.id); e.dataTransfer.effectAllowed = "move"; }}
                  className="cursor-grab rounded-lg border border-ink-600 bg-ink-800 p-3 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setEditing(s)} className="text-left text-sm font-medium text-slate-100 hover:text-accent" title="Edit story">{s.title}</button>
                    <Badge>{s.points}</Badge>
                  </div>
                  {s.description && <p className="mt-1 text-xs text-slate-400">{s.description}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      {s.assignee ? <><Avatar name={s.assignee} size={18} /> {s.assignee}</> : <span className="text-slate-600">unassigned</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditing(s)} className="rounded p-0.5 text-slate-500 hover:text-fg" aria-label="Edit story"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                      <select
                        aria-label="Move story"
                        value={s.status}
                        onChange={(e) => move(s.id, e.target.value as StoryStatus)}
                        className="rounded border border-ink-600 bg-ink-900 px-1 py-0.5 text-[11px] text-slate-300"
                      >
                        {STORY_STATUSES.map((st) => (
                          <option key={st} value={st}>{STORY_STATUS_LABEL[st]}</option>
                        ))}
                      </select>
                      <ActionForm action={deleteStoryAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="storyId" value={s.id} />
                        <button className="px-1 text-xs text-slate-500 hover:text-bad" type="submit" aria-label="Delete story">✕</button>
                      </ActionForm>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {col === "todo" && sprint && (
              <ActionForm action={createStoryAction} success="Added" resetOnSuccess className="mt-2 space-y-1.5 border-t border-ink-700 pt-2">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sprintId" value={sprint.id} />
                <input name="title" className="input py-1 text-xs" placeholder="New story…" required />
                <div className="flex gap-1.5">
                  <input name="points" type="number" min={0} max={40} defaultValue={3} className="input w-16 py-1 text-xs" aria-label="Points" />
                  <select name="assignee" className="input py-1 text-xs" defaultValue="" aria-label="Assignee"><option value="">Unassigned</option>{team.map((m) => <option key={m.id} value={m.name.split(" ")[0]}>{m.name} · {m.role}</option>)}</select>
                  <button className="btn-ghost px-2 py-1 text-xs" type="submit">Add</button>
                </div>
              </ActionForm>
            )}
          </section>
        );
      })}
      {editing && (
        <Modal title="Edit story" onClose={() => setEditing(null)}>
          <ActionForm action={async (fd) => { await updateStoryAction(fd); setEditing(null); }} success="Story updated" className="space-y-3">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="storyId" value={editing.id} />
            <div><label className="label" htmlFor="e-title">Title</label><input id="e-title" name="title" defaultValue={editing.title} className="input" required /></div>
            <div><label className="label" htmlFor="e-desc">Description / acceptance criteria</label><textarea id="e-desc" name="description" defaultValue={editing.description} rows={3} className="input" /></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><label className="label" htmlFor="e-points">Points</label><input id="e-points" name="points" type="number" min={0} max={40} defaultValue={editing.points} className="input" /></div>
              <div><label className="label" htmlFor="e-assignee">Assignee</label><select id="e-assignee" name="assignee" defaultValue={editing.assignee} className="input"><option value="">Unassigned</option>{!team.some((m) => m.name.split(" ")[0] === editing.assignee) && editing.assignee && <option value={editing.assignee}>{editing.assignee}</option>}{team.map((m) => <option key={m.id} value={m.name.split(" ")[0]}>{m.name} · {m.role}</option>)}</select></div>
              <div><label className="label" htmlFor="e-status">Status</label>
                <select id="e-status" name="status" defaultValue={editing.status} className="input">{STORY_STATUSES.map((st) => <option key={st} value={st}>{STORY_STATUS_LABEL[st]}</option>)}</select></div>
              <div><label className="label" htmlFor="e-sprint">Sprint</label>
                <select id="e-sprint" name="sprintId" defaultValue={editing.sprintId ?? ""} className="input"><option value="">Backlog</option>{sprints.map((sp) => <option key={sp.id} value={sp.id}>Sprint {sp.number}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><SubmitButton>Save changes</SubmitButton></div>
          </ActionForm>
        </Modal>
      )}
    </div>
  );
}
