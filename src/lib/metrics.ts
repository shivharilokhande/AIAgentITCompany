// src/lib/metrics.ts
// Pure functions. No I/O. Everything here is unit-tested.
import type { Sprint, UserStory, PhaseState, GateCheck, FileReview, Contract, VelocityPoint, BurndownPoint, GateResult } from "./types";

export function phaseProgress(phases: PhaseState[]): number {
  if (phases.length === 0) return 0;
  const done = phases.filter((p) => p.status === "done").length;
  return Math.round((done / phases.length) * 100);
}

export function velocity(sprints: Sprint[], stories: UserStory[]): VelocityPoint[] {
  return sprints
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((sp) => {
      const inSprint = stories.filter((s) => s.sprintId === sp.id);
      const planned = inSprint.reduce((acc, s) => acc + s.points, 0);
      const delivered = inSprint.filter((s) => s.status === "done").reduce((acc, s) => acc + s.points, 0);
      return { sprint: sp.number, planned, delivered };
    });
}

/** Day-by-day remaining points for a sprint, plus the ideal straight line. */
export function burndown(sprint: Sprint, stories: UserStory[], today: Date = new Date()): BurndownPoint[] {
  const inSprint = stories.filter((s) => s.sprintId === sprint.id);
  const total = inSprint.reduce((a, s) => a + s.points, 0);
  const start = dayStart(new Date(sprint.startDate));
  const end = dayStart(new Date(sprint.endDate));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const cutoff = dayStart(today);
  const points: BurndownPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * 86_400_000);
    const ideal = days === 1 ? 0 : Math.round((total * (1 - i / (days - 1))) * 100) / 100;
    if (day > cutoff) {
      points.push({ day: iso(day), remaining: NaN, ideal });
      continue;
    }
    const endOfDay = new Date(day.getTime() + 86_400_000 - 1);
    const donePts = inSprint
      .filter((s) => s.status === "done" && s.doneAt && new Date(s.doneAt) <= endOfDay)
      .reduce((a, s) => a + s.points, 0);
    points.push({ day: iso(day), remaining: total - donePts, ideal });
  }
  return points;
}

export function gateScore(checks: GateCheck[]): number {
  if (checks.length === 0) return 0;
  const pass = checks.filter((c) => c.status === "pass").length;
  return Math.round((pass / checks.length) * 100);
}

export function lgtmRatio(reviews: FileReview[]): { total: number; lgtm: number; lbtm: number; ratio: number; files: number } {
  // Latest verdict per file counts.
  const latest = new Map<string, FileReview>();
  for (const r of reviews.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))) latest.set(r.file, r);
  const arr = Array.from(latest.values());
  const lgtm = arr.filter((r) => r.verdict === "LGTM").length;
  return { total: reviews.length, lgtm, lbtm: arr.length - lgtm, ratio: arr.length ? Math.round((lgtm / arr.length) * 100) : 0, files: arr.length };
}

export const splitList = (v: string | undefined): string[] =>
  (v ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

/** SOP-1 consistency gate: File List (B) == Logic Analysis files (C) == Task List (C). */
export function consistencyGate(b: Contract, c: Contract): GateResult {
  const fileList = splitList(b.fields.file_list);
  const logicFiles = splitList(c.fields.logic_analysis).map((line) => line.split(/\s+[—–-]{1,2}\s+|:\s+/)[0].trim()).filter(Boolean);
  const taskList = splitList(c.fields.task_list).map((line) => line.replace(/^\d+[.)]\s*/, "").trim());
  const issues: string[] = [];
  if (fileList.length === 0) issues.push("Contract B File List is empty.");
  if (taskList.length === 0) issues.push("Contract C Task List is empty.");
  if (logicFiles.length === 0) issues.push("Contract C Logic Analysis is empty.");
  const fl = new Set(fileList), lf = new Set(logicFiles), tl = new Set(taskList);
  for (const f of fileList) {
    if (!lf.has(f)) issues.push(`"${f}" is in File List but has no Logic Analysis row.`);
    if (!tl.has(f)) issues.push(`"${f}" is in File List but not in Task List.`);
  }
  for (const f of logicFiles) if (!fl.has(f)) issues.push(`Logic Analysis mentions "${f}" which is not in File List.`);
  for (const f of taskList) if (!fl.has(f)) issues.push(`Task List contains "${f}" which is not in File List.`);
  if (new Set(taskList).size !== taskList.length) issues.push("Task List has duplicate entries.");
  return { ok: issues.length === 0, issues, fileList, logicFiles, taskList };
}

export function pointsByStatus(stories: UserStory[]): Record<string, number> {
  return stories.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + s.points;
    return acc;
  }, {});
}

function dayStart(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
function iso(d: Date): string { return d.toISOString().slice(0, 10); }
