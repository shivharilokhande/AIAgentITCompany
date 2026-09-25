"use client";
// src/components/ChatPanel.tsx
// Cowork-style chat for a project: threads (one per command) on the left, a full-height conversation in the middle
// (your request → the company's persona steps → the Founder's delivery), and a big composer at the bottom.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Activity, Command, CommandKind, Project } from "@/lib/types";
import { PERSONAS as CORE_PERSONAS } from "@/lib/pipeline";
import { STEP_META } from "./RunView";
import { Avatar, Badge, Empty } from "./ui";
import { Icon, Spinner, useToast } from "./system";
import type { EngineInfo } from "@/lib/settings";

const KIND_LABEL: Record<CommandKind, string> = { ask: "Ask", fetch_details: "Fetch complete details", run_phase: "Run phase / build", plan_sprint: "Plan sprint", review: "Review files", sync: "Sync with repo", custom: "Custom" };
type Member = { id: string; name: string; role: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}

export function ChatPanel({ project, engine, initialActivity, initialCommands }: { project: Project; engine: EngineInfo; initialActivity: Activity[]; initialCommands: Command[] }) {
  const { push } = useToast();
  const auto = engine.mode !== "cowork" && engine.ready;
  const [team, setTeam] = useState<Member[]>(CORE_PERSONAS);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [commands, setCommands] = useState<Command[]>(initialCommands);
  const [selected, setSelected] = useState<string | "all">("all");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<CommandKind>("ask");
  const [busy, setBusy] = useState(false);
  const [showDetail, setShowDetail] = useState<Record<string, boolean>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const seqRef = useRef<number>(initialActivity.reduce((m, a) => Math.max(m, a.seq), 0));
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const member = (id: string) => team.find((m) => m.id === id);

  useEffect(() => { fetch("/api/bridge/team", { cache: "no-store" }).then((r) => r.json()).then((j) => j.team && setTeam(j.team)).catch(() => {}); }, []);

  const refresh = useCallback(async () => {
    try {
      const a = await api<{ activity: Activity[] }>(`/api/bridge/activity?since=${seqRef.current}&limit=200&project=${project.id}`);
      if (a.activity.length) { seqRef.current = Math.max(seqRef.current, ...a.activity.map((x) => x.seq)); setActivity((prev) => [...prev, ...a.activity].slice(-2000)); }
      const c = await api<{ commands: Command[] }>(`/api/bridge/commands?limit=100&project=${project.id}`);
      setCommands(c.commands);
      fetch("/api/bridge/tick", { method: "POST" }).catch(() => {});
    } catch { /* offline */ }
  }, [project.id]);
  useEffect(() => { const t = setInterval(refresh, 3000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => { if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [activity.length, selected, autoScroll]);

  const send = async (k: CommandKind = kind, t: string = text) => {
    if (!t.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ command: Command }>("/api/bridge/commands", { method: "POST", body: JSON.stringify({ text: t.trim(), kind: k, project: project.id, source: "app" }) });
      setText(""); setSelected(r.command.id); setAutoScroll(true);
      push({ tone: "good", text: auto ? `Sent — ${engine.label.replace("Engine: ", "")} is on it` : "Sent — the company picks it up on the next Cowork check" });
      await refresh();
    } catch (e) { push({ tone: "bad", text: (e as Error).message }); } finally { setBusy(false); }
  };

  // thread = command; messages = its activity
  const byCommand = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of activity) { const k = a.commandId ?? "_none"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(a); }
    return m;
  }, [activity]);
  const ordered = useMemo(() => commands.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [commands]);
  const visible = selected === "all" ? ordered : ordered.filter((c) => c.id === selected);
  const running = commands.filter((c) => c.status === "running").length;
  const quick: Array<{ kind: CommandKind; text: string; icon: string; label: string }> = [
    { kind: "fetch_details", label: "Fetch details", icon: "download", text: `Fetch complete details for ${project.name}${project.repoPath ? ` from ${project.repoPath}` : ""} and fill the console.` },
    { kind: "run_phase", label: "Run current phase", icon: "flow", text: `Run Phase ${project.currentPhase} for ${project.name} and publish its deliverables.` },
    { kind: "plan_sprint", label: "Plan sprint", icon: "board", text: `Plan the next sprint for ${project.name} from the backlog with story points.` },
    { kind: "review", label: "Review", icon: "shield", text: `Run the SOP-4 six-question review on all files in Contract B for ${project.name}.` },
  ];

  return (
    <div className="grid h-[calc(100vh-13.5rem)] min-h-[560px] grid-cols-[260px_1fr] gap-0 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      {/* Threads */}
      <aside className="flex min-h-0 flex-col border-r border-border bg-surface-2/40">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Conversations</span>
          {running > 0 && <Badge tone="info"><Spinner className="h-3 w-3" /> {running} running</Badge>}
        </div>
        <button onClick={() => setSelected("all")} className={`m-2 rounded-lg px-3 py-2 text-left text-sm ${selected === "all" ? "bg-accent/10 font-medium text-accent" : "text-fg-2 hover:bg-surface-2"}`}>All activity</button>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {ordered.slice().reverse().map((c) => {
            const n = byCommand.get(c.id)?.length ?? 0;
            const tone = { queued: "warn", running: "info", done: "good", failed: "bad" }[c.status] as "warn" | "info" | "good" | "bad";
            return (
              <button key={c.id} onClick={() => setSelected(c.id)} className={`mb-1 w-full rounded-lg px-3 py-2 text-left ${selected === c.id ? "bg-accent/10" : "hover:bg-surface-2"}`}>
                <div className="flex items-center gap-1.5"><Badge tone={tone}>{c.status === "running" ? <Spinner className="h-3 w-3" /> : null} {c.status}</Badge><span className="text-[10px] text-muted">{KIND_LABEL[c.kind]}</span></div>
                <div className="mt-1 line-clamp-2 text-xs text-fg">{c.text.replace(/^\[Live: Cowork session [^\]]+\]\s*/, "")}</div>
                <div className="mt-0.5 text-[10px] text-muted">{new Date(c.createdAt).toLocaleString()} · {n} steps</div>
              </button>
            );
          })}
          {ordered.length === 0 && <div className="p-3 text-xs text-muted">No conversations yet.</div>}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg"><Icon name="spark" className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-fg">Smart IT company · {project.name}</div>
            <div className="text-[11px] text-muted"><Link href="/configuration" className="hover:text-fg">{engine.label}</Link> · every reply is a company run: Founder → C-suite → Product → Architecture → Engineers → QA → DevOps → Delivery</div>
          </div>
          <label className="flex items-center gap-1 text-[11px] text-muted"><input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} /> follow</label>
          {selected !== "all" && <Link href={`/projects/${project.id}/runs/${selected}`} className="btn-ghost btn-sm"><Icon name="flow" className="h-3.5 w-3.5" /> Company run view</Link>}
        </header>

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" onScroll={(e) => { const el = e.currentTarget; setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 80); }}>
          {visible.length === 0 ? (
            <div className="mx-auto mt-16 max-w-md text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Icon name="spark" className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold text-fg">Ask the company anything about {project.name}</h3>
              <p className="mt-1 text-sm text-muted">Questions, analysis, features to add, a sprint to plan, code to review. Watch each persona think, decide and build, live.</p>
            </div>
          ) : visible.map((c) => {
            const steps = byCommand.get(c.id) ?? [];
            const asked = steps.find((s) => s.type === "command.queued" || s.type === "session.user");
            const body = steps.filter((s) => !["command.queued", "session.user", "command.done", "command.failed", "command.started"].includes(s.type));
            return (
              <div key={c.id} className="mb-8">
                {/* user bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-fg shadow-card">
                    <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-80">{c.source === "cowork" ? "You · via Cowork" : "You"} · {KIND_LABEL[c.kind]}</div>
                    {c.text.replace(/^\[Live: Cowork session [^\]]+\]\s*/, "")}
                  </div>
                </div>
                <div className="mt-1 text-right text-[10px] text-muted">{new Date(c.createdAt).toLocaleString()}{asked?.meta?.session ? ` · session “${String(asked.meta.session)}”` : ""}</div>

                {/* company steps */}
                <div className="mt-3 space-y-2">
                  {body.length === 0 && c.status !== "done" && (
                    <div className="flex items-center gap-2 text-sm text-muted"><Spinner className="h-3.5 w-3.5" /> {c.status === "queued" ? "Waiting for the company to pick this up…" : "Working…"}</div>
                  )}
                  {body.map((a) => {
                    const p = member(a.persona);
                    const m = STEP_META[a.step ?? ""];
                    const open = showDetail[a.id];
                    return (
                      <div key={a.id} className="flex items-start gap-2.5 animate-fadein">
                        {p ? <Avatar name={p.name} size={28} /> : <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon name="bolt" className="h-3.5 w-3.5" /></span>}
                        <div className="min-w-0 max-w-[85%]">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                            <span className="font-semibold text-fg">{p ? p.name : a.actor}</span>{p && <span>· {p.role}</span>}
                            {a.step && <Badge tone={m.tone}><Icon name={m.icon} className="h-3 w-3" /> {m.label}</Badge>}
                            {a.phase && <span>P{a.phase}</span>}
                            <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="mt-0.5 rounded-2xl rounded-tl-md border border-border bg-surface-2 px-3.5 py-2 text-sm text-fg">
                            <div className="whitespace-pre-wrap break-words">{a.message}</div>
                            {a.detail && <button type="button" onClick={() => setShowDetail((o) => ({ ...o, [a.id]: !o[a.id] }))} className="mt-1 text-[11px] text-accent hover:underline">{open ? "Hide detail" : "Show detail"}</button>}
                            {open && a.detail && <pre className="mono mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-[11px] leading-5 text-fg-2">{a.detail}</pre>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* delivery */}
                {(c.status === "done" || c.status === "failed") && (
                  <div className="mt-3 flex items-start gap-2.5">
                    <Avatar name="Arjun Mehta" size={28} />
                    <div className="min-w-0 max-w-[85%]">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted"><span className="font-semibold text-fg">Arjun Mehta</span><span>· Founder & CEO</span><Badge tone={c.status === "done" ? "good" : "bad"}>{c.status === "done" ? "Delivered" : "Failed"}</Badge>{c.finishedAt && <span>{new Date(c.finishedAt).toLocaleTimeString()}</span>}</div>
                      <div className={`mt-0.5 rounded-2xl rounded-tl-md border px-4 py-3 text-sm text-fg ${c.status === "done" ? "border-good/30 bg-good/5" : "border-bad/30 bg-bad/5"}`}>
                        <pre className="whitespace-pre-wrap font-sans">{c.result || "(no summary)"}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-surface p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quick.map((q) => <button key={q.kind} type="button" disabled={busy} onClick={() => send(q.kind, q.text)} className="btn-ghost btn-sm" title={q.text}><Icon name={q.icon} className="h-3.5 w-3.5" /> {q.label}</button>)}
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-2 focus-within:border-accent">
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }} rows={3} className="w-full resize-none bg-transparent px-2 py-1 text-sm text-fg placeholder:text-muted-2 focus:outline-none" placeholder={`Message the company about ${project.name}… e.g. "What AI features can we add? Analyse, prioritise and plan them."`} />
            <div className="flex items-center justify-between gap-2 px-1">
              <select value={kind} onChange={(e) => setKind(e.target.value as CommandKind)} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-fg-2" aria-label="Command kind">
                {(Object.keys(KIND_LABEL) as CommandKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              <div className="flex items-center gap-2 text-[11px] text-muted"><span className="kbd">⌘↵</span> send
                <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={() => send()}>{busy ? <Spinner /> : <Icon name="send" />} Send</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
