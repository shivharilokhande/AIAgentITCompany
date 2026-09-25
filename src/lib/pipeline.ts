// src/lib/pipeline.ts
// Single source of truth for the Smart IT by Shiv operating model.
// Per-project *state* lives in SQLite; this file is the static *model* (ADR-002).
import type { PipelineDef, Persona, PhaseDef, SopDef, PoolRule, GateCheckDef, ContractFieldDef } from "./types";

export const PERSONAS: Persona[] = [
  { id: "founder", name: "Arjun Mehta", role: "Founder & CEO", layer: 1, reportsTo: null, focus: ["Vision lock", "Final decisions", "Delivery"], file: "leadership/founder-ceo.md" },
  { id: "cto", name: "Vikram Rao", role: "CTO", layer: 2, reportsTo: "founder", focus: ["Tech stack", "Architecture review", "Security posture"], file: "leadership/cto.md" },
  { id: "cfo", name: "Priya Sharma", role: "CFO", layer: 2, reportsTo: "founder", focus: ["Effort estimate", "Sprint budget", "Abort thresholds"], file: "leadership/cfo.md" },
  { id: "cpo", name: "Deepa Krishnan", role: "CPO", layer: 2, reportsTo: "founder", focus: ["User journeys", "MVP scope", "Acceptance criteria"], file: "leadership/cpo.md" },
  { id: "dir-eng", name: "Karthik V.", role: "Director of Engineering", layer: 3, reportsTo: "cto", focus: ["DORA metrics", "Engineer assignment", "Sprint report"], file: "engineering/director-engineering.md" },
  { id: "dir-prod", name: "Rajan Iyer", role: "Director of Product", layer: 3, reportsTo: "cpo", focus: ["Sprint plan", "Definition of Done", "Risk register"], file: "product/director-product.md" },
  { id: "dir-design", name: "Meera Joshi", role: "Director of Design", layer: 3, reportsTo: "cpo", focus: ["Wireframes", "Design tokens", "Accessibility"], file: "design/director-design.md" },
  { id: "scrum", name: "Kavitha Nair", role: "Scrum Master", layer: 4, reportsTo: "dir-eng", focus: ["Sprint execution", "Task List order", "Velocity"], file: "engineering/scrum-master.md" },
  { id: "architect", name: "Srinivas Iyengar", role: "Architect", layer: 4, reportsTo: "dir-eng", focus: ["Contract B", "DB schema", "ADRs"], file: "engineering/architect.md" },
  { id: "ba", name: "Ananya Desai", role: "Business Analyst", layer: 4, reportsTo: "dir-prod", focus: ["Contract A", "User stories", "Edge cases"], file: "product/business-analyst.md" },
  { id: "be-senior", name: "Arun Patel", role: "Backend Senior", layer: 5, reportsTo: "scrum", focus: ["Java / Go / Python", "Event-driven", "Performance"], file: "engineering/backend-senior.md" },
  { id: "be", name: "Nikhil Gupta", role: "Backend Engineer", layer: 5, reportsTo: "scrum", focus: ["Platform services", "Auth", "Integrations"], file: "engineering/backend.md" },
  { id: "fe", name: "Rhea Menon", role: "Frontend Engineer", layer: 5, reportsTo: "scrum", focus: ["React / Next.js", "TypeScript", "Design systems"], file: "engineering/frontend.md" },
  { id: "qa", name: "Divya Srinivasan", role: "QA Lead", layer: 5, reportsTo: "scrum", focus: ["Quality gate", "E2E", "Code summary / is-pass"], file: "engineering/qa.md" },
  { id: "devops", name: "Rohan Chakraborty", role: "DevOps", layer: 5, reportsTo: "scrum", focus: ["Docker / K8s", "CI/CD", "Observability"], file: "engineering/devops.md" },
];

export const SOPS: SopDef[] = [
  { id: "SOP-1", title: "Structured Handoff Contracts", oneLine: "Every phase output is a fixed field schema (Contracts A/B/C), never prose. Consistency gate before code.", phases: [3, 4] },
  { id: "SOP-2", title: "Shared Message Pool", oneLine: "Roles publish documents and subscribe only to what they need — no point-to-point chat.", phases: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: "SOP-3", title: "One-File Coding Protocol", oneLine: "One complete file per unit of work, in Task List order, following Contract B exactly. No TODOs.", phases: [5] },
  { id: "SOP-4", title: "LGTM / LBTM Review Loop", oneLine: "Six fixed review questions per file immediately after writing; max k=2 passes.", phases: [5] },
  { id: "SOP-5", title: "Executable Feedback + Code Summary", oneLine: "Run → debug (≤3/file) → whole-codebase summary → is-pass YES/NO feeds next iteration.", phases: [5, 6] },
  { id: "SOP-6", title: "Incremental Mode", oneLine: "Existing codebase: classify BUG/REQUIREMENT, refine contracts, git-diff Code Plan & Change, then build.", phases: [3, 4, 5] },
  { id: "SOP-7", title: "Phase Wiring", oneLine: "Defines exactly where SOP-1…6 fire inside the 8 phases.", phases: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: "SOP-8", title: "State File", oneLine: "Contracts, task order, verdicts, debug iterations, is-pass and open TODOs tracked per project.", phases: [5, 6, 8] },
  { id: "SOP-9", title: "Delivery Package", oneLine: "TASK_PLAN.md, CODE_SUMMARY.md (and CODE_PLAN_AND_CHANGE.md in inc mode) ship with the product.", phases: [8] },
  { id: "SOP-10", title: "Not Imported", oneLine: "No human-in-the-loop pauses, no fixed 5-role team, no Python-only assumption.", phases: [] },
];

export const PHASES: PhaseDef[] = [
  { n: 1, name: "Vision Lock", leads: ["founder"], deliverables: ["VISION.md"], sops: ["SOP-2"], summary: "Founder restates the idea, fixes must-haves vs v2, sets success criteria. Nobody asks the user anything." },
  { n: 2, name: "Strategy", leads: ["cto", "cfo", "cpo"], deliverables: ["STRATEGY.md"], sops: ["SOP-2"], summary: "CTO picks the stack via the decision tree, CFO sets sprint budget and abort thresholds, CPO defines MVP scope." },
  { n: 3, name: "Specification", leads: ["ba", "dir-prod", "dir-design"], deliverables: ["SPECIFICATION.md (Contract A)", "USER_STORIES.md", "DATA_MODEL.md"], sops: ["SOP-1", "SOP-6"], summary: "PRD as Contract A: goals, user stories, competitive quadrant, P0/P1/P2 requirement pool, UI draft. Every UNCLEAR self-resolved." },
  { n: 4, name: "Architecture", leads: ["architect", "cto"], deliverables: ["ARCHITECTURE.md (Contract B)", "TASK_PLAN.md (Contract C)", "DB_SCHEMA.md", "API_DOCS.md", "ADRs"], sops: ["SOP-1", "SOP-6"], summary: "File List, classDiagram, sequenceDiagram (B); pinned packages, logic analysis, dependency-ordered Task List, OpenAPI, shared knowledge (C). Consistency gate must pass." },
  { n: 5, name: "Sprint Execution", leads: ["scrum", "be-senior", "be", "fe", "qa", "devops"], deliverables: ["src/**", "tests/**", "CODE_SUMMARY.md", "SPRINT_REPORT.md"], sops: ["SOP-3", "SOP-4", "SOP-5"], summary: "Files written in Task List order, one at a time, reviewed LGTM/LBTM on the spot; each sprint ends with run → summarize → is-pass." },
  { n: 6, name: "Quality Gate", leads: ["qa"], deliverables: ["QUALITY_REPORT.md"], sops: ["SOP-5"], summary: "Divya's 10-check pipeline. An open is-pass NO is an automatic fail on Check 4." },
  { n: 7, name: "Deployment", leads: ["devops"], deliverables: ["Dockerfile", "docker-compose.yml", ".github/workflows/ci.yml", "DEPLOYMENT.md"], sops: ["SOP-2"], summary: "Pinned packages from Contract C flow straight into manifests. No version drift." },
  { n: 8, name: "Delivery", leads: ["founder", "scrum"], deliverables: ["README.md", "Final package"], sops: ["SOP-8", "SOP-9"], summary: "What was built, what was deferred, quick start, known gaps (residual TODOs, k-cap acceptances)." },
];

export const POOL: PoolRule[] = [
  { role: "Founder / CEO", publishes: ["VISION.md", "Delivery summary"], subscribes: ["everything (override authority)"] },
  { role: "CTO / CFO / CPO", publishes: ["STRATEGY.md"], subscribes: ["VISION.md"] },
  { role: "BA / Dir. Product / Dir. Design", publishes: ["SPECIFICATION.md (A)", "USER_STORIES.md", "DATA_MODEL.md"], subscribes: ["VISION.md", "STRATEGY.md"] },
  { role: "Architect", publishes: ["ARCHITECTURE.md (B)", "DB_SCHEMA.md", "API_DOCS.md", "ADRs"], subscribes: ["SPECIFICATION.md", "STRATEGY.md"] },
  { role: "Scrum Master", publishes: ["TASK_PLAN.md (C)", "SPRINT_REPORT.md", "state file"], subscribes: ["ARCHITECTURE.md", "USER_STORIES.md"] },
  { role: "Engineers", publishes: ["src/**", "tests/**", "review verdicts"], subscribes: ["Contract B", "Contract C", "Shared Knowledge", "earlier files in Task List"] },
  { role: "QA", publishes: ["QUALITY_REPORT.md", "CODE_SUMMARY.md"], subscribes: ["src", "tests", "Contracts B + C"] },
  { role: "DevOps", publishes: ["Dockerfile", "compose", "CI", "DEPLOYMENT.md"], subscribes: ["Required Packages", "Shared Knowledge", "ARCHITECTURE.md"] },
];

const A: ContractFieldDef[] = [
  { key: "language", label: "Language", type: "text", hint: "e.g. en_us" },
  { key: "programming_language", label: "Programming Language", type: "text", hint: "Set by CTO in Phase 2" },
  { key: "original_requirements", label: "Original Requirements", type: "textarea", hint: "User's idea verbatim" },
  { key: "project_name", label: "Project Name", type: "text", hint: "snake_case" },
  { key: "product_goals", label: "Product Goals", type: "list", hint: "Exactly 3, one per line" },
  { key: "user_stories", label: "User Stories", type: "list", hint: "3–5, one per line: As a <role>, I want <capability> so that <outcome>" },
  { key: "competitive_analysis", label: "Competitive Analysis", type: "list", hint: "5–7, one per line: <name>: <strength>, <weakness>" },
  { key: "competitive_quadrant", label: "Competitive Quadrant Chart", type: "mermaid", hint: "mermaid quadrantChart" },
  { key: "requirement_analysis", label: "Requirement Analysis", type: "textarea", hint: "Hard parts, hidden deps, scope risk" },
  { key: "requirement_pool", label: "Requirement Pool", type: "list", hint: "5–7, one per line: P0|P1|P2 <requirement>" },
  { key: "ui_design_draft", label: "UI Design Draft", type: "textarea", hint: "One paragraph per major screen" },
  { key: "anything_unclear", label: "Anything UNCLEAR", type: "textarea", hint: "Surface, then self-resolve and record the assumption" },
];
const B: ContractFieldDef[] = [
  { key: "implementation_approach", label: "Implementation Approach", type: "textarea", hint: "Hard points → frameworks that make them easy" },
  { key: "file_list", label: "File List", type: "list", hint: "Every source file, relative path, one per line" },
  { key: "data_structures", label: "Data Structures and Interfaces", type: "mermaid", hint: "mermaid classDiagram — engineers may not invent members absent here" },
  { key: "call_flow", label: "Program Call Flow", type: "mermaid", hint: "mermaid sequenceDiagram using only classes above" },
  { key: "anything_unclear", label: "Anything UNCLEAR", type: "textarea", hint: "Surface, then self-resolve" },
];
const C: ContractFieldDef[] = [
  { key: "required_packages", label: "Required Packages", type: "list", hint: "Pinned, one per line" },
  { key: "other_language_packages", label: "Required Other-Language Packages", type: "list", hint: "or None" },
  { key: "logic_analysis", label: "Logic Analysis", type: "list", hint: "one per line: <file> — <classes/functions, imports, dependents>" },
  { key: "task_list", label: "Task List", type: "list", hint: "File List in dependency order, one per line" },
  { key: "api_spec", label: "Full API Spec", type: "textarea", hint: "OpenAPI 3.0 YAML, or N/A" },
  { key: "shared_knowledge", label: "Shared Knowledge", type: "textarea", hint: "Conventions every engineer must know" },
  { key: "anything_unclear", label: "Anything UNCLEAR", type: "textarea", hint: "Surface, then self-resolve" },
];

export const GATE: GateCheckDef[] = [
  { n: 1, name: "TDD compliance", what: "Tests exist and were written before/with code; LGTM verdicts on all files." },
  { n: 2, name: "Unit + integration tests", what: "All green." },
  { n: 3, name: "E2E tests", what: "Primary user journey passes end-to-end." },
  { n: 4, name: "Verification loop", what: "build + lint + typecheck + tests all green; is-pass = YES." },
  { n: 5, name: "Security audit", what: "No secrets, injection, auth or dependency findings." },
  { n: 6, name: "Performance", what: "Meets targets in STRATEGY.md." },
  { n: 7, name: "Accessibility", what: "Keyboard, contrast, labels." },
  { n: 8, name: "Silent failures", what: "No swallowed errors; explicit error paths and logging." },
  { n: 9, name: "Coverage quality", what: "Behavioral coverage ≥ 80% on core logic." },
  { n: 10, name: "Framework verify", what: "Framework-specific checks (e.g. Next build, Spring context) pass." },
];

export const PIPELINE: PipelineDef = {
  phases: PHASES,
  personas: PERSONAS,
  sops: SOPS,
  pool: POOL,
  contracts: {
    A: { title: "Contract A — PRD", owner: "Business Analyst + Director Product", feeds: "SPECIFICATION.md", fields: A },
    B: { title: "Contract B — System Design", owner: "Architect + CTO review", feeds: "ARCHITECTURE.md", fields: B },
    C: { title: "Contract C — Task Plan", owner: "Scrum Master + Architect", feeds: "TASK_PLAN.md", fields: C },
  },
  gate: GATE,
};

export const personaById = (id: string): Persona | undefined => PERSONAS.find((p) => p.id === id);
export const phaseByN = (n: number): PhaseDef | undefined => PHASES.find((p) => p.n === n);
