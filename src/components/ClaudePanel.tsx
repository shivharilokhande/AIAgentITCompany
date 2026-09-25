"use client";
// src/components/ClaudePanel.tsx
// Live Claude Bridge UI: activity feed (polling), command composer, commands table. Works globally or per project.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Activity, Command, CommandKind, Project } from "@/lib/types";
import { PERSONAS as CORE_PERSONAS } from "@/lib/pipeline";
import { stepMeta } from "./RunView";
import { Badge, Card, Empty, Avatar } from "./ui";
import { Icon, Spinner, useToast } from "./system";
import type { EngineInfo } from "@/lib/settings";

const KIND_LABEL: Record<CommandKind, string> = { ask: "Ask", fetch_details: "Fetch complete details", run_phase: "Run phase", plan_sprint: "Plan sprint", review: "Review files", sync: "Sync with repo", custom: "Custom" };
const ACTOR_TONE: Record<string, string> = { user: "accent", claude: "good", engine: "info", system: "neutral" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}

export function ClaudePanel({ project, engine, initialActivity, initialCommands, compact }: { project?: Project | null; engine: EngineInfo; initialActivity: Activity[]; initialCommands: Command[]; compact?: boolean }) {
  const { push } = useToast();
  const auto = engine.mode !== "cowork" && engine.ready;
  const [team, setTeam] = useState<Array<{ id: string; name: string; role: string }>>(CORE_PERSONAS);
  useEffect(() => { fetch("/api/bridge/team", { cache: "no-store" }).then((r) => r.json()).then((j) => j.team && setTeam(j.team)).catch(() => {}); }, []);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [commands, setCommands] = useState<Command[]>(initialCommands);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<CommandKind>("ask");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(true);
  const seqRef = useRef<number>(initialActivity.reduce((m, a) => Math.max(m, a.seq), 0));
  const feedRef = useRef<HTMLDivElement>(null);
  const pq = project ? `&project=${encodeURIComponent(project.id)}` : "";

  const refresh = useCallback(async () => {
    try {
      const a = await api<{ activity: Activity[]; latestSeq: number }>(`/api/bridge/activity?since=${seqRef.current}&limit=100${pq}`);
      if (a.activity.length) {
        seqRef.current = Math.max(seqRef.current, ...a.activity.map((x) => x.seq));
        setActivity((prev) => [...prev, ...a.activity].slice(-300));
        requestAnimationFrame(() => feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" }));
      }
      const c = await api<{ commands: Command[] }>(`/api/bridge/commands?limit=50${pq}`);
      setCommands(c.commands);
      await fetch("/api/bridge/tick", { method: "POST" });
    } catch { /* offline — keep last state */ }
  }, [pq, engine]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [live, refresh]);

  const send = async (k: CommandKind = kind, t: string = text) => {
    if (!t.trim()) return;
    setBusy(true);
    try {
      await api("/api/bridge/commands", { method: "POST", body: JSON.stringify({ text: t.trim(), kind: k, project: project?.id, source: "app" }) });
      setText("");
      push({ tone: "good", text: auto ? `Queued — ${engine.label.replace("Engine: ", "")} will pick it up in a moment` : "Queued — will run when Claude Cowork checks the console" });
      await refresh();
    } catch (e) {
      push({ tone: "bad", text: (e as Error).message });
    } finally { setBusy(false); }
  };

  const quick: Array<{ kind: CommandKind; text: string; icon: string }> = project
    ? [
        { kind: "fetch_details", text: `Fetch complete details for ${project.name}${project.repoPath ? ` from ${project.repoPath}` : ""} and fill the console (phases, requirement pool, stories, contracts, ADRs).`, icon: "download" },
        { kind: "run_phase", text: `Run the current phase (Phase ${project.currentPhase}) for ${project.name} and publish its deliverables.`, icon: "flow" },
        { kind: "plan_sprint", text: `Plan the next sprint for ${project.name} from the backlog with story points.`, icon: "board" },
        { kind: "review", text: `Run the SOP-4 six-question review on all files in Contract B for ${project.name}.`, icon: "shield" },
        { kind: "sync", text: `Sync ${project.name} with its repository and report deltas.`, icon: "refresh" },
      ]
    : [{ kind: "sync", text: "List every project you know about in Cowork and import the ones missing from the console.", icon: "download" }];

  const queued = commands.filter((c) => c.status === "queued").length;
  const running = commands.filter((c) => c.status === "running").length;

  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-5"}`}>
      {/* Composer + commands */}
      <div className={`space-y-4 ${compact ? "" : "lg:col-span-2"}`}>
        <Card title={<span className="flex items-center gap-2"><Icon name="spark" className="h-4 w-4 text-accent" /> Ask Claude {project ? `about ${project.name}` : ""}</span>} right={<Link href="/configuration"><Badge tone={engine.mode === "cowork" ? "accent" : engine.ready ? "good" : "warn"}>{engine.label}</Badge></Link>}>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q.kind} type="button" disabled={busy} onClick={() => send(q.kind, q.text)} className="btn-ghost btn-sm" title={q.text}>
                <Icon name={q.icon} className="h-3.5 w-3.5" /> {KIND_LABEL[q.kind]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as CommandKind)} className="input w-40" aria-label="Command kind">
              {(Object.keys(KIND_LABEL) as CommandKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }} rows={2} className="input" placeholder={project ? `e.g. "Add a P0 requirement for offline mode and plan it into Sprint 2"` : `e.g. "Import NamastePOS from /Users/shiv/AI Development/NamastePOS-Marketing"`} />
            <button type="button" className="btn-primary self-end" disabled={busy || !text.trim()} onClick={() => send()}>{busy ? <Spinner /> : <Icon name="send" />}</button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {auto
              ? `${engine.reason} Every command becomes a company run with the Smart IT SOPs.`
              : engine.mode !== "cowork"
                ? <span className="text-warn">{engine.reason} Until then commands wait for Claude Cowork.</span>
                : <>Commands wait in the queue. In Claude Cowork say <span className="mono">“check the console”</span> (or run the scheduled task) and Claude picks them up, works, and streams progress here.</>}
            {" "}⌘↵ to send.
          </p>
        </Card>

        <Card title="Commands" right={<div className="flex gap-1">{queued > 0 && <Badge tone="warn">{queued} queued</Badge>}{running > 0 && <Badge tone="info">{running} running</Badge>}</div>}>
          {commands.length === 0 ? <Empty>No commands yet.</Empty> : (
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {commands.map((c) => <CommandRow key={c.id} c={c} projectId={project?.id ?? c.projectId} onDelete={async () => { await api(`/api/bridge/commands/${c.id}`, { method: "DELETE" }); refresh(); }} />)}
            </ul>
          )}
        </Card>
      </div>

      {/* Live feed */}
      <Card className={compact ? "" : "lg:col-span-3"} title={<span className="flex items-center gap-2">Live activity <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-good" : "bg-muted-2"}`} /></span>} right={<div className="flex items-center gap-2"><button className="btn-ghost btn-sm" onClick={() => refresh()}><Icon name="refresh" className="h-3.5 w-3.5" /> Refresh</button><button className="btn-ghost btn-sm" onClick={() => setLive((l) => !l)}>{live ? "Pause" : "Resume"}</button></div>}>
        <div ref={feedRef} className="max-h-[640px] min-h-[320px] overflow-y-auto pr-1">
          {activity.length === 0 ? <Empty>Nothing yet. Send a command or run “check the console” in Claude Cowork.</Empty> : (
            <ol className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 animate-fadein">
                  <div className="mt-0.5 shrink-0">{a.persona && team.find((p) => p.id === a.persona) ? <Avatar name={team.find((p) => p.id === a.persona)!.name} size={24} /> : a.actor === "user" ? <Avatar name="Shivhari" size={24} /> : <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${a.actor === "engine" ? "bg-info/15 text-info" : a.actor === "claude" ? "bg-good/15 text-good" : "bg-surface-2 text-muted"}`}><Icon name={a.actor === "system" ? "bolt" : "spark"} className="h-3.5 w-3.5" /></span>}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {a.persona && team.find((p) => p.id === a.persona) ? <span className="font-semibold text-fg">{team.find((p) => p.id === a.persona)!.name} <span className="font-normal">· {team.find((p) => p.id === a.persona)!.role}</span></span> : <Badge tone={ACTOR_TONE[a.actor] ?? "neutral"}>{a.actor}</Badge>}
                      {a.step && <Badge tone={stepMeta(a.step).tone}><Icon name={stepMeta(a.step).icon} className="h-3 w-3" /> {stepMeta(a.step).label}</Badge>}
                      {a.phase && <span>P{a.phase}</span>}
                      {!a.step && <span className="mono">{a.type}</span>}
                      {a.commandId && project && <Link href={`/projects/${project.id}/runs/${a.commandId}`} className="text-accent hover:underline">run ↗</Link>}
                      <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                      {!project && a.projectId && <span className="text-accent">project</span>}
                    </div>
                    <div className="whitespace-pre-wrap break-words text-sm text-fg">{a.message}</div>
                    {typeof a.meta?.result === "string" && a.meta.result.length > 0 && <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-surface-2 p-2 text-[11px] text-fg-2">{String(a.meta.result)}</pre>}
                    {a.meta?.counts != null && typeof a.meta.counts === "object" && <div className="mt-1 text-[11px] text-muted">{Object.entries(a.meta.counts as Record<string, number>).map(([k, v]) => `${v} ${k}`).join(" · ")}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>
    </div>
  );
}

function CommandRow({ c, projectId, onDelete }: { c: Command; projectId: string | null; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const tone = { queued: "warn", running: "info", done: "good", failed: "bad" }[c.status] as "warn" | "info" | "good" | "bad";
  return (
    <li className="py-2">
      <div className="flex items-start gap-2">
        <Badge tone={tone}>{c.status === "running" ? <><Spinner className="h-3 w-3" /> running</> : c.status}</Badge>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpen((o) => !o)} className="block w-full truncate text-left text-sm text-fg hover:text-accent" title={c.text}>{c.text}</button>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">{KIND_LABEL[c.kind]} · {c.source} · {new Date(c.createdAt).toLocaleString()}{c.finishedAt && ` · ${Math.round((new Date(c.finishedAt).getTime() - new Date(c.startedAt ?? c.createdAt).getTime()) / 1000)}s`}
            {projectId && <Link href={`/projects/${projectId}/runs/${c.id}`} className="ml-1 inline-flex items-center gap-1 text-accent hover:underline"><Icon name="flow" className="h-3 w-3" /> Open company run</Link>}</div>
        </div>
        {c.status !== "running" && <button type="button" onClick={onDelete} className="text-muted hover:text-bad" aria-label="Delete command"><Icon name="trash" className="h-3.5 w-3.5" /></button>}
      </div>
      {open && (c.result || c.text) && (
        <div className="mt-2 rounded-lg border border-border bg-surface-2 p-3 text-xs text-fg-2">
          <div className="mb-1 font-semibold text-fg">Command</div>
          <p className="whitespace-pre-wrap">{c.text}</p>
          {c.result && <><div className="mb-1 mt-3 font-semibold text-fg">Result</div><p className="whitespace-pre-wrap">{c.result}</p></>}
        </div>
      )}
    </li>
  );
}

/** Small connection card explaining how Cowork talks to this console. */
export function ConnectionCard({ engine, tokenRequired }: { engine: EngineInfo; tokenRequired: boolean }) {
  const [origin, setOrigin] = useState("http://localhost:3100");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const { push } = useToast();
  const copy = (t: string) => { navigator.clipboard?.writeText(t); push({ tone: "info", text: "Copied" }); };
  const cmd = `curl -s ${origin}/api/bridge/commands?status=queued`;
  return (
    <Card title={<span className="flex items-center gap-2"><Icon name="link" /> Connection</span>} right={<Badge tone="good">online</Badge>}>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="label">Base URL</dt><dd className="mono text-xs text-fg">{origin}/api/bridge</dd></div>
        <div><dt className="label">Engine</dt><dd className="text-xs text-fg">{engine.label.replace("Engine: ", "")} — {engine.reason} <Link href="/configuration" className="text-accent hover:underline">Change</Link></dd></div>
        <div><dt className="label">Auth</dt><dd className="text-xs text-fg">{tokenRequired ? "Bearer token required (BRIDGE_TOKEN)" : "Open (local only). Set BRIDGE_TOKEN to require a token."}</dd></div>
        <div><dt className="label">Cowork skill</dt><dd className="text-xs text-fg"><span className="mono">smartit-console-bridge</span> — say “check the console” or “sync &lt;project&gt; to the console”.</dd></div>
      </dl>
      <div className="mt-3 rounded-lg bg-surface-2 p-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted"><span>Endpoints</span><button className="hover:text-fg" onClick={() => copy(cmd)}>copy sample</button></div>
        <pre className="mono overflow-x-auto text-[11px] leading-5 text-fg-2">{`GET  /health                    status, queue counts, engine
GET  /projects                  list · POST bundle to upsert
GET  /projects/:idOrName        full ProjectBundle export
PATCH /projects/:idOrName       merge a partial bundle
POST /import                    one or many bundles
GET  /commands?status=queued    queue · ?claim=1 claims next
POST /commands {text,kind,project}
PATCH /commands/:id {status,result}
GET  /activity?since=SEQ · POST /activity {message,type,project}
GET  /snapshot?project=NAME     repo tree + key files (repoPath)`}</pre>
      </div>
    </Card>
  );
}
