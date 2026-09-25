// src/lib/claude.ts
// In-app engine: processes queued commands with whatever LLM bridge is active in Configuration
// (Anthropic, OpenAI/Codex, Gemini, OpenRouter, custom OpenAI-compatible, or local Ollama).
// In Cowork mode, commands wait for a Claude Cowork session (see the smartit-console-bridge skill) to pick them up.
import fs from "node:fs";
import path from "node:path";
import * as repo from "./repo";
import * as bridge from "./bridge";
import type { Command, ProjectBundle, Activity } from "./types";
import { PIPELINE } from "./pipeline";
import { engineInfo } from "./settings";
import { chat, extractJson } from "./llm";

/** True when the console processes commands itself (mode is API or Ollama and the provider is configured). */
export const engineEnabled = (): boolean => { const i = engineInfo(); return i.mode !== "cowork" && i.ready; };
export { engineInfo };

const SYSTEM = `You are the Smart IT by Shiv company (Founder Arjun Mehta + 14 personas) operating inside SmartIT Console.
You follow the SOP layer: structured contracts (A = PRD, B = System Design, C = Task Plan), publish/subscribe message pool,
one-file coding protocol, LGTM/LBTM review, executable feedback, incremental mode. Nobody asks the user anything: resolve
every ambiguity with the most conventional assumption and record it under "Anything UNCLEAR".

You respond with ONE JSON object and nothing else:
{
  "answer": "<markdown, what you did / found, concise>",
  "bundle": <optional ProjectBundle to import>,
  "activity": [ {"type": "<short.type>", "message": "<one line>"} ]  // optional progress lines
}

ProjectBundle shape (all optional except project.name/idea):
{ "project": {"name","idea","mode":"greenfield|incremental","repoPath","tags","owner","deployStatus":"not_deployed|staging|production"},
  "phases":[{"phase":1..8,"status":"pending|active|done","summary"}],
  "requirements":[{"priority":"P0|P1|P2","text"}],
  "sprints":[{"number","goal","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","status":"planned|active|closed"}],
  "stories":[{"title","description","points","status":"todo|in_progress|review|done","assignee","sprintNumber"}],
  "contracts":{"A":{...fields},"B":{...},"C":{...}},
  "reviews":[{"file","verdict":"LGTM|LBTM","pass":1|2,"notes"}],
  "gate":[{"check":1..10,"status":"pending|pass|fail","note"}],
  "adrs":[{"title","decision"}],
  "summary":{"isPass":"YES|NO|pending","todos","cycles"} }

Contract field keys — A: ${PIPELINE.contracts.A.fields.map((f) => f.key).join(", ")}.
B: ${PIPELINE.contracts.B.fields.map((f) => f.key).join(", ")}. C: ${PIPELINE.contracts.C.fields.map((f) => f.key).join(", ")}.
List-type fields are newline-separated strings. Keep bundles truthful to the evidence you were given; do not invent files that don't exist in the repo snapshot.`;

const TEXT_EXT = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ts", ".tsx", ".js", ".py", ".go", ".java", ".kt", ".rs", ".sql", ".env.example", ".html", ".css"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", "target", "vendor", "__pycache__", ".venv", "venv"]);

/** Read a compact snapshot of a repo: tree + key docs + small source files. Bounded in size. */
export function snapshotRepo(root: string, maxBytes = 120_000): { tree: string[]; files: Array<{ path: string; content: string }> } {
  const tree: string[] = [];
  const files: Array<{ path: string; content: string }> = [];
  if (!root || !fs.existsSync(root)) return { tree, files };
  let budget = maxBytes;
  const priority = ["CLAUDE.md", "README.md", "readme.md", "package.json", "pyproject.toml", "go.mod", "ARCHITECTURE.md", "VISION.md", "SPECIFICATION.md", "TASK_PLAN.md", ".agents/product-marketing.md"];
  const walk = (dir: string, depth: number) => {
    if (depth > 4 || tree.length > 400) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".") && e.name !== ".agents") continue;
      if (e.isDirectory()) { if (SKIP_DIRS.has(e.name)) continue; tree.push(path.relative(root, path.join(dir, e.name)) + "/"); walk(path.join(dir, e.name), depth + 1); }
      else tree.push(path.relative(root, path.join(dir, e.name)));
    }
  };
  walk(root, 0);
  const take = (rel: string) => {
    const full = path.join(root, rel);
    try {
      const st = fs.statSync(full);
      if (!st.isFile() || st.size > 40_000 || budget <= 0) return;
      const content = fs.readFileSync(full, "utf8").slice(0, Math.min(40_000, budget));
      budget -= content.length;
      files.push({ path: rel, content });
    } catch { /* ignore */ }
  };
  for (const p of priority) if (fs.existsSync(path.join(root, p))) take(p);
  for (const rel of tree) {
    if (budget <= 0) break;
    if (files.some((f) => f.path === rel)) continue;
    const ext = path.extname(rel).toLowerCase();
    if (rel.endsWith("/") || !TEXT_EXT.has(ext)) continue;
    if (rel.split("/").length > 3) continue;
    take(rel);
  }
  return { tree, files };
}

function buildUserPrompt(cmd: Command): string {
  const parts: string[] = [];
  const project = cmd.projectId ? repo.getProject(cmd.projectId) : null;
  parts.push(`# Command\nkind: ${cmd.kind}\ntext: ${cmd.text}`);
  if (project) {
    const bundle = bridge.exportProject(project.id);
    parts.push(`# Current project state (ProjectBundle)\n${JSON.stringify(bundle).slice(0, 60_000)}`);
    if (project.repoPath) {
      const snap = snapshotRepo(project.repoPath);
      parts.push(`# Repository snapshot: ${project.repoPath}\n## Tree\n${snap.tree.join("\n")}\n## Files\n${snap.files.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n")}`);
    }
  } else {
    parts.push(`# All projects\n${JSON.stringify(repo.listProjects().map((p) => ({ id: p.id, name: p.name, idea: p.idea, phase: p.currentPhase })))}`);
  }
  const guidance: Record<string, string> = {
    fetch_details: "Produce a complete, truthful ProjectBundle for this project from the repository snapshot and current state: project idea, phases done so far, requirement pool (P0/P1/P2), user stories, contracts A/B/C as far as evidence allows, ADRs you can infer from docs, deployment status. Use replace:false.",
    run_phase: "Execute the requested phase as the owning personas would, publishing its deliverables into the bundle (e.g. Contract A for Phase 3, Contracts B+C for Phase 4). Mark that phase done in phases[] and the next active.",
    plan_sprint: "Create the next sprint (number = max+1, 2 weeks from today) and plan stories into it from the backlog / requirement pool with points. Return sprints[] and stories[].",
    review: "Perform the SOP-4 six-question review on the files named (or all files in Contract B File List). Return reviews[] with LGTM/LBTM + notes, and a summary with is-pass.",
    ask: "Answer the question using the project state and repo snapshot. If the request implies changes (add stories, requirements, ADRs, phase updates), include them in bundle.",
    sync: "Reconcile the project state with the repository snapshot; return only the deltas as a bundle.",
    custom: "Do what the text asks within the Smart IT operating model.",
  };
  parts.push(`# Guidance\n${guidance[cmd.kind] ?? guidance.custom}\nToday: ${new Date().toISOString().slice(0, 10)}`);
  return parts.join("\n\n");
}

async function callLlm(system: string, user: string): Promise<string> {
  return (await chat({ system, user })).text;
}
const parseJson = extractJson;

/** Which phases a company run visits per command kind (SOP-7). */
const RUN_PLAN: Record<string, number[]> = {
  ask: [1, 2, 3, 4, 5, 6, 7, 8],
  custom: [1, 2, 3, 4, 5, 6, 7, 8],
  fetch_details: [1, 2, 3, 4, 8],
  run_phase: [1, 2, 3, 4, 5, 6, 7, 8],
  plan_sprint: [1, 3, 5, 8],
  review: [1, 5, 6, 8],
  sync: [1, 4, 5, 8],
};

const PHASE_BRIEF: Record<number, string> = {
  1: "Founder: restate the request as a vision. Fix must-haves vs v2. Decide scope. Ask nothing; record assumptions.",
  2: "CTO analyzes tech options and picks; CFO estimates effort/sprints and sets abort thresholds; CPO fixes MVP scope and acceptance criteria.",
  3: "BA writes user stories and requirement pool (P0/P1/P2); Director Product sets DoD and risks; Director Design drafts screens.",
  4: "Architect produces Contract B (file list, classDiagram, sequenceDiagram) and Contract C (task order, shared knowledge); CTO reviews.",
  5: "Scrum Master plans the sprint; Backend Senior/Backend/Frontend write the actual code per SOP-3 one file at a time; each file gets a SOP-4 LGTM/LBTM review.",
  6: "QA runs the 10-check quality gate, executes tests, writes CODE_SUMMARY with is-pass.",
  7: "DevOps prepares deployment: Dockerfile/CI/env changes, rollout and rollback notes.",
  8: "Founder compiles the delivery: what was built, what was deferred, known gaps, next steps.",
};

interface PhaseOut { steps: Array<{ persona: string; step: string; message: string; detail?: string }>; bundle?: ProjectBundle }

/** Process one queued command as a full company run: one Claude call per phase, each persona's steps streamed to the feed. */
export async function processNextCommand(): Promise<Command | null> {
  if (!engineEnabled()) return null;
  const cmd = bridge.claimNextCommand();
  if (!cmd) return null;
  const project = cmd.projectId ? repo.getProject(cmd.projectId) : null;
  const phases = RUN_PLAN[cmd.kind] ?? RUN_PLAN.custom;
  const transcript: string[] = [];
  let finalAnswer = "";
  const info = engineInfo();
  bridge.logActivity({ projectId: cmd.projectId, actor: "engine", type: "engine.start", message: `Company run started on ${info.label.replace("Engine: ", "")}`, commandId: cmd.id, phase: phases[0], step: "think", persona: "founder" });
  try {
    for (const n of phases) {
      const def = PIPELINE.phases.find((p) => p.n === n)!;
      const personas = def.leads.map((id) => PIPELINE.personas.find((p) => p.id === id)!);
      const system = `${SYSTEM}\n\nYou are now executing PHASE ${n} — ${def.name}. Personas on the field: ${personas.map((p) => `${p.id} (${p.name}, ${p.role})`).join("; ")}.\n${PHASE_BRIEF[n]}\nRespond with ONE JSON object: {"steps":[{"persona":"<id>","step":"think|analyze|decide|write|design|code|review|test|deploy|deliver","message":"<one line, what this persona did/decided>","detail":"<optional: reasoning, code, file list, test output>"}], "bundle": <optional partial ProjectBundle with only what this phase produced>}. 2–6 steps. Each step must name a persona from this phase. Be concrete and truthful to the evidence.`;
      const user = `${buildUserPrompt(cmd)}\n\n# Earlier phases in this run\n${transcript.join("\n") || "(none yet)"}`;
      bridge.logActivity({ projectId: cmd.projectId, actor: "engine", type: `phase.${n}.start`, message: `Phase ${n} — ${def.name}: ${personas.map((p) => p.name.split(" ")[0]).join(", ")} on the field`, commandId: cmd.id, phase: n, step: "think", persona: personas[0].id });
      const raw = await callLlm(system, user);
      const out = parseJson(raw) as PhaseOut;
      for (const st of out.steps ?? []) {
        const persona = personas.some((p) => p.id === st.persona) ? st.persona : personas[0].id;
        bridge.logActivity({ projectId: cmd.projectId, actor: "claude", type: `phase.${n}.${st.step || "note"}`, message: st.message, detail: st.detail ?? "", commandId: cmd.id, phase: n, step: (st.step as Activity["step"]) || "note", persona });
        transcript.push(`[P${n} ${persona}/${st.step}] ${st.message}`);
        if (n === 8) finalAnswer += st.message + "\n";
      }
      if (out.bundle && project) {
        const bundle: ProjectBundle = { ...out.bundle, project: { ...(out.bundle.project ?? {}), id: project.id, name: out.bundle.project?.name ?? project.name, idea: out.bundle.project?.idea ?? project.idea } };
        const r = bridge.importProject(bundle, "claude");
        const counts = Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(", ");
        if (counts) bridge.logActivity({ projectId: cmd.projectId, actor: "engine", type: `phase.${n}.published`, message: `Published to the pool: ${counts}`, commandId: cmd.id, phase: n, step: "write", persona: personas[0].id });
      }
    }
    return bridge.updateCommand(cmd.id, { status: "done", result: finalAnswer.trim() || transcript.slice(-5).join("\n") });
  } catch (e) {
    return bridge.updateCommand(cmd.id, { status: "failed", result: `Engine error: ${(e as Error).message}\n\nProgress so far:\n${transcript.join("\n")}` });
  }
}
