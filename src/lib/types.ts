export type PhaseStatus = "pending" | "active" | "done";
export type StoryStatus = "todo" | "in_progress" | "review" | "done";
export type Priority = "P0" | "P1" | "P2";
export type ContractKind = "A" | "B" | "C";
export type Verdict = "LGTM" | "LBTM";
export type GateStatus = "pending" | "pass" | "fail";
export type IsPass = "YES" | "NO" | "pending";
export type SprintStatus = "planned" | "active" | "closed";
export type DeployStatus = "not_deployed" | "staging" | "production";

export const STORY_STATUSES: StoryStatus[] = ["todo", "in_progress", "review", "done"];
export const STORY_STATUS_LABEL: Record<StoryStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review (LGTM/LBTM)",
  done: "Done",
};

export interface Project {
  id: string;
  name: string;
  slug: string;
  idea: string;
  currentPhase: number;
  mode: "greenfield" | "incremental";
  deployStatus: DeployStatus;
  createdAt: string;
  repoPath: string;
  source: "manual" | "claude";
  lastSyncedAt: string | null;
  tags: string;
  owner: string;
}

/* ---- Claude Bridge ---- */
export type CommandStatus = "queued" | "running" | "done" | "failed";
export type CommandKind = "ask" | "fetch_details" | "run_phase" | "plan_sprint" | "review" | "sync" | "custom";
export type CommandSource = "app" | "cowork" | "engine";
export interface Command {
  id: string;
  projectId: string | null;
  source: CommandSource;
  kind: CommandKind;
  text: string;
  status: CommandStatus;
  result: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
export type Actor = "user" | "claude" | "system" | "engine";
/** What kind of work a persona is doing in a step. */
export type StepKind = "ask" | "think" | "analyze" | "decide" | "write" | "design" | "code" | "review" | "test" | "deploy" | "deliver" | "note";
export const STEP_KINDS: StepKind[] = ["ask", "think", "analyze", "decide", "write", "design", "code", "review", "test", "deploy", "deliver", "note"];
export interface Activity {
  id: string;
  seq: number;
  projectId: string | null;
  actor: Actor;
  type: string;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
  /** Persona id from pipeline.ts (founder, cto, ba, architect, scrum, fe, qa, devops…) — empty for system lines. */
  persona: string;
  phase: number | null;
  step: StepKind | "";
  commandId: string | null;
  /** Longer body: reasoning, code, file list, test output. Shown expandable in the run view. */
  detail: string;
}
/** Full project export/import payload used by the bridge. */
export interface ProjectBundle {
  project: Partial<Project> & { name: string; idea: string };
  phases?: Array<Pick<PhaseState, "phase" | "status" | "summary">>;
  requirements?: Array<Pick<Requirement, "priority" | "text">>;
  sprints?: Array<Pick<Sprint, "number" | "goal" | "startDate" | "endDate" | "status">>;
  stories?: Array<Pick<UserStory, "title" | "description" | "points" | "status" | "assignee"> & { sprintNumber?: number | null }>;
  contracts?: Partial<Record<ContractKind, Record<string, string>>>;
  reviews?: Array<Pick<FileReview, "file" | "verdict" | "pass" | "notes">>;
  gate?: Array<Pick<GateCheck, "check" | "status" | "note">>;
  adrs?: Array<Pick<Adr, "title" | "decision">>;
  summary?: Pick<CodeSummary, "isPass" | "todos" | "cycles">;
  replace?: boolean; // true = wipe children before import
}
export interface PhaseState {
  projectId: string;
  phase: number;
  status: PhaseStatus;
  summary: string;
  completedAt: string | null;
}
export interface Requirement {
  id: string;
  projectId: string;
  priority: Priority;
  text: string;
  order: number;
}
export interface Sprint {
  id: string;
  projectId: string;
  number: number;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
}
export interface UserStory {
  id: string;
  projectId: string;
  sprintId: string | null;
  title: string;
  description: string;
  points: number;
  status: StoryStatus;
  assignee: string;
  order: number;
  doneAt: string | null;
  createdAt: string;
}
export interface Contract {
  projectId: string;
  kind: ContractKind;
  fields: Record<string, string>;
  updatedAt: string;
}
export interface FileReview {
  id: string;
  projectId: string;
  file: string;
  verdict: Verdict;
  pass: number;
  notes: string;
  createdAt: string;
}
export interface GateCheck {
  projectId: string;
  check: number;
  status: GateStatus;
  note: string;
}
export interface Adr {
  id: string;
  projectId: string;
  title: string;
  decision: string;
  createdAt: string;
}
export interface CodeSummary {
  projectId: string;
  isPass: IsPass;
  todos: string;
  cycles: number;
}

/* ---- static pipeline model ---- */
export interface Persona {
  id: string;
  name: string;
  role: string;
  layer: number; // 1 founder, 2 c-suite, 3 directors, 4 leads, 5 engineers
  reportsTo: string | null;
  focus: string[];
  file: string;
}
export interface PhaseDef {
  n: number;
  name: string;
  leads: string[]; // persona ids
  deliverables: string[];
  sops: string[]; // sop ids
  summary: string;
}
export interface SopDef {
  id: string;
  title: string;
  oneLine: string;
  phases: number[];
}
export interface PoolRule {
  role: string;
  publishes: string[];
  subscribes: string[];
}
export interface ContractFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "list" | "mermaid";
  hint: string;
}
export interface GateCheckDef {
  n: number;
  name: string;
  what: string;
}
export interface PipelineDef {
  phases: PhaseDef[];
  personas: Persona[];
  sops: SopDef[];
  pool: PoolRule[];
  contracts: Record<ContractKind, { title: string; owner: string; feeds: string; fields: ContractFieldDef[] }>;
  gate: GateCheckDef[];
}

/* ---- metrics ---- */
export interface VelocityPoint { sprint: number; planned: number; delivered: number }
export interface BurndownPoint { day: string; remaining: number; ideal: number }
export interface GateResult { ok: boolean; issues: string[]; fileList: string[]; logicFiles: string[]; taskList: string[] }
