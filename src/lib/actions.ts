"use server";
// src/lib/actions.ts
// All mutations. Each validates FormData, writes via repo, revalidates the project layout.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "./repo";
import type { ContractKind, GateStatus, IsPass, PhaseStatus, Priority, SprintStatus, StoryStatus, Verdict, DeployStatus } from "./types";
import { STORY_STATUSES } from "./types";
import { PIPELINE } from "./pipeline";

const str = (fd: FormData, k: string, max = 4000): string => String(fd.get(k) ?? "").slice(0, max);
const int = (fd: FormData, k: string, dflt = 0): number => {
  const v = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(v) ? v : dflt;
};
const oneOf = <T extends string>(v: string, allowed: readonly T[], dflt: T): T => (allowed.includes(v as T) ? (v as T) : dflt);
const reval = (pid: string) => revalidatePath(`/projects/${pid}`, "layout");

/* ---- projects ---- */
export async function createProjectAction(fd: FormData): Promise<void> {
  const name = str(fd, "name", 120).trim();
  const idea = str(fd, "idea", 2000).trim();
  if (!name || !idea) return;
  const mode = oneOf(str(fd, "mode"), ["greenfield", "incremental"] as const, "greenfield");
  const p = repo.createProject({ name, idea, mode, repoPath: str(fd, "repoPath", 500).trim() });
  revalidatePath("/", "layout");
  redirect(`/projects/${p.id}`);
}
export async function updateProjectAction(fd: FormData): Promise<void> {
  const id = str(fd, "projectId");
  if (!id) return;
  repo.updateProject(id, {
    name: str(fd, "name", 120).trim() || undefined,
    idea: str(fd, "idea", 2000).trim() || undefined,
    mode: oneOf(str(fd, "mode"), ["greenfield", "incremental"] as const, "greenfield"),
    repoPath: str(fd, "repoPath", 500).trim(),
    tags: str(fd, "tags", 300).trim(),
    owner: str(fd, "owner", 120).trim(),
  });
  reval(id);
  revalidatePath("/", "layout");
}
export async function deleteProjectAction(fd: FormData): Promise<void> {
  const id = str(fd, "projectId");
  if (!id) return;
  repo.deleteProject(id);
  revalidatePath("/", "layout");
  redirect("/");
}
export async function setDeployAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const status = oneOf(str(fd, "status"), ["not_deployed", "staging", "production"] as const, "not_deployed") as DeployStatus;
  repo.updateProject(pid, { deployStatus: status });
  reval(pid);
}

/* ---- phases ---- */
export async function setPhaseAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const phase = int(fd, "phase", 1);
  const status = oneOf(str(fd, "status"), ["pending", "active", "done"] as const, "active") as PhaseStatus;
  const summary = str(fd, "summary", 1000);
  if (phase < 1 || phase > 8) return;
  repo.setPhase(pid, phase, status, summary || undefined);
  reval(pid);
  revalidatePath("/", "layout");
}
export async function savePhaseSummaryAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.setPhaseSummary(pid, int(fd, "phase", 1), str(fd, "summary", 1000));
  reval(pid);
}

/* ---- requirements ---- */
export async function addRequirementAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const text = str(fd, "text", 500).trim();
  if (!text) return;
  repo.addRequirement(pid, oneOf(str(fd, "priority"), ["P0", "P1", "P2"] as const, "P1") as Priority, text);
  reval(pid);
}
export async function updateRequirementAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.updateRequirement(str(fd, "id"), { priority: oneOf(str(fd, "priority"), ["P0", "P1", "P2"] as const, "P1") as Priority });
  reval(pid);
}
export async function deleteRequirementAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.deleteRequirement(str(fd, "id"));
  reval(pid);
}

/* ---- contracts ---- */
export async function saveContractAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const kind = oneOf(str(fd, "kind"), ["A", "B", "C"] as const, "A") as ContractKind;
  const fields: Record<string, string> = {};
  for (const f of PIPELINE.contracts[kind].fields) fields[f.key] = str(fd, `f_${f.key}`, 20000);
  repo.saveContract(pid, kind, fields);
  reval(pid);
}

/* ---- sprints ---- */
export async function createSprintAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const startDate = str(fd, "startDate", 10) || new Date().toISOString().slice(0, 10);
  const endDate = str(fd, "endDate", 10) || new Date(Date.now() + 13 * 86_400_000).toISOString().slice(0, 10);
  repo.createSprint(pid, { goal: str(fd, "goal", 300), startDate, endDate });
  reval(pid);
}
export async function updateSprintAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const id = str(fd, "sprintId");
  const status = str(fd, "status");
  repo.updateSprint(id, {
    status: status ? (oneOf(status, ["planned", "active", "closed"] as const, "planned") as SprintStatus) : undefined,
    goal: fd.has("goal") ? str(fd, "goal", 300) : undefined,
    startDate: fd.has("startDate") ? str(fd, "startDate", 10) : undefined,
    endDate: fd.has("endDate") ? str(fd, "endDate", 10) : undefined,
  });
  reval(pid);
}
export async function deleteSprintAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.deleteSprint(str(fd, "sprintId"));
  reval(pid);
}

/* ---- stories ---- */
export async function createStoryAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const title = str(fd, "title", 200).trim();
  if (!title) return;
  const sprintId = str(fd, "sprintId") || null;
  repo.createStory(pid, {
    title,
    description: str(fd, "description", 2000),
    points: int(fd, "points", 1),
    sprintId,
    assignee: str(fd, "assignee", 80),
    status: oneOf(str(fd, "status"), STORY_STATUSES, "todo") as StoryStatus,
  });
  reval(pid);
}
export async function moveStoryAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const status = oneOf(str(fd, "status"), STORY_STATUSES, "todo") as StoryStatus;
  repo.updateStory(str(fd, "storyId"), { status });
  reval(pid);
}
export async function updateStoryAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const id = str(fd, "storyId");
  repo.updateStory(id, {
    title: fd.has("title") ? str(fd, "title", 200) : undefined,
    description: fd.has("description") ? str(fd, "description", 2000) : undefined,
    points: fd.has("points") ? int(fd, "points", 1) : undefined,
    assignee: fd.has("assignee") ? str(fd, "assignee", 80) : undefined,
    sprintId: fd.has("sprintId") ? str(fd, "sprintId") || null : undefined,
    status: fd.has("status") ? (oneOf(str(fd, "status"), STORY_STATUSES, "todo") as StoryStatus) : undefined,
  });
  reval(pid);
}
export async function deleteStoryAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.deleteStory(str(fd, "storyId"));
  reval(pid);
}

/* ---- reviews ---- */
export async function addReviewAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const file = str(fd, "file", 300).trim();
  if (!file) return;
  repo.addReview(pid, { file, verdict: oneOf(str(fd, "verdict"), ["LGTM", "LBTM"] as const, "LGTM") as Verdict, pass: int(fd, "pass", 1), notes: str(fd, "notes", 2000) });
  reval(pid);
}
export async function deleteReviewAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.deleteReview(str(fd, "id"));
  reval(pid);
}

/* ---- gate ---- */
export async function setGateAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const status = oneOf(str(fd, "status"), ["pending", "pass", "fail"] as const, "pending") as GateStatus;
  repo.setGateCheck(pid, int(fd, "check", 1), status, fd.has("note") ? str(fd, "note", 500) : undefined);
  reval(pid);
}

/* ---- ADRs ---- */
export async function addAdrAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const title = str(fd, "title", 200).trim();
  const decision = str(fd, "decision", 4000).trim();
  if (!title || !decision) return;
  repo.addAdr(pid, title, decision);
  reval(pid);
}
export async function deleteAdrAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.deleteAdr(str(fd, "id"));
  reval(pid);
}

/* ---- code summary ---- */
export async function saveSummaryAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  repo.saveSummary(pid, { isPass: oneOf(str(fd, "isPass"), ["YES", "NO", "pending"] as const, "pending") as IsPass, todos: str(fd, "todos", 8000), cycles: int(fd, "cycles", 0) });
  reval(pid);
}

/* ---- team & parallel lanes ---- */
import * as team from "./team";
import { dispatchSprint } from "./dispatch";

export async function hireAction(fd: FormData): Promise<void> {
  const name = str(fd, "name", 80).trim();
  if (!name) return;
  team.hire({ name, role: str(fd, "role", 80).trim() || "Engineer", specialty: str(fd, "specialty", 200).trim(), capacity: int(fd, "capacity", 1), reportsTo: str(fd, "reportsTo", 40) || "scrum", layer: int(fd, "layer", 5) });
  revalidatePath("/", "layout");
}
export async function updateMemberAction(fd: FormData): Promise<void> {
  const id = str(fd, "id", 64);
  if (!id) return;
  team.updateMember(id, {
    capacity: fd.has("capacity") ? int(fd, "capacity", 1) : undefined,
    specialty: fd.has("specialty") ? str(fd, "specialty", 200) : undefined,
    role: fd.has("role") ? str(fd, "role", 80) : undefined,
    active: fd.has("active") ? str(fd, "active") === "1" : undefined,
  });
  revalidatePath("/", "layout");
}
export async function removeMemberAction(fd: FormData): Promise<void> {
  team.removeHired(str(fd, "id", 64));
  revalidatePath("/", "layout");
}
export async function dispatchAction(fd: FormData): Promise<void> {
  const pid = str(fd, "projectId");
  const sprintId = str(fd, "sprintId");
  if (!pid || !sprintId) return;
  dispatchSprint(pid, sprintId, { max: fd.has("max") ? int(fd, "max", 99) : undefined });
  reval(pid);
}
