// src/lib/dispatch.ts
// Scrum Master dispatch: fill idle engineer lanes with the next To-Do stories of a sprint and create one
// Cowork command per story so Claude builds them in parallel (one sub-agent per lane).
import * as repo from "./repo";
import * as bridge from "./bridge";
import { builders } from "./team";
import type { UserStory } from "./types";

export interface DispatchResult { assigned: Array<{ story: UserStory; engineer: string }>; lanes: number; inProgress: number; idle: string[] }

export function laneStatus(projectId: string, sprintId: string) {
  const stories = repo.listStories(projectId).filter((s) => s.sprintId === sprintId);
  const team = builders();
  const inProg = stories.filter((s) => s.status === "in_progress");
  const load = new Map<string, number>();
  for (const s of inProg) { const key = team.find((m) => m.name.split(" ")[0].toLowerCase() === s.assignee.split(" ")[0].toLowerCase() || m.name.toLowerCase() === s.assignee.toLowerCase())?.id ?? s.assignee; load.set(key, (load.get(key) ?? 0) + 1); }
  const lanes = team.reduce((a, m) => a + m.capacity, 0);
  const free = team.map((m) => ({ m, free: Math.max(0, m.capacity - (load.get(m.id) ?? 0)) }));
  return { stories, team, inProg, lanes, free };
}

/** Assign up to `free` lanes worth of To-Do stories; returns what was dispatched. */
export function dispatchSprint(projectId: string, sprintId: string, opts: { max?: number } = {}): DispatchResult {
  const { stories, team, inProg, lanes, free } = laneStatus(projectId, sprintId);
  const sprint = repo.getSprint(sprintId);
  const todo = stories.filter((s) => s.status === "todo").sort((a, b) => a.order - b.order);
  const assigned: DispatchResult["assigned"] = [];
  let budget = opts.max ?? Infinity;
  // round-robin over engineers with free capacity; prefer an engineer already named on the story
  const slots = free.flatMap(({ m, free: f }) => Array.from({ length: f }, () => m));
  for (const story of todo) {
    if (budget <= 0 || slots.length === 0) break;
    let idx = slots.findIndex((m) => story.assignee && (m.name.toLowerCase().startsWith(story.assignee.toLowerCase()) || m.id === story.assignee));
    if (idx < 0) {
      // specialty match: frontend words → FE-ish engineer
      const fe = /ui|screen|widget|flutter|dashboard|frontend|react|page|css/i.test(story.title + " " + story.description);
      idx = slots.findIndex((m) => fe ? /front|flutter|ui|mobile|web/i.test(m.role + " " + m.specialty) : /back|platform|api|senior|server/i.test(m.role + " " + m.specialty));
      if (idx < 0) idx = 0;
    }
    const [eng] = slots.splice(idx, 1);
    repo.updateStory(story.id, { status: "in_progress", assignee: eng.name.split(" ")[0] });
    const cmd = bridge.createCommand({ projectId, source: "cowork", kind: "run_phase", text: `Build story "${story.title}" (Sprint ${sprint?.number ?? "?"}, ${story.points} pts) as ${eng.name} — ${eng.role}${eng.specialty ? `, ${eng.specialty}` : ""}. ${story.description}`.slice(0, 900) });
    bridge.logActivity({ projectId, actor: "claude", type: "phase.5.decide", message: `Dispatched "${story.title}" → ${eng.name} (${eng.role}); lane ${lanes - slots.length}/${lanes}`, persona: "scrum", phase: 5, step: "decide", commandId: cmd.id, meta: { storyId: story.id, engineer: eng.id } });
    assigned.push({ story: { ...story, status: "in_progress", assignee: eng.name.split(" ")[0] }, engineer: eng.name });
    budget--;
  }
  return { assigned, lanes, inProgress: inProg.length + assigned.length, idle: slots.map((m) => m.name) };
}
