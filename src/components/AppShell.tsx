"use client";
// src/components/AppShell.tsx
// Enterprise app shell: collapsible icon sidebar, top bar with breadcrumbs, ⌘K command palette, theme toggle, engine status.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Project } from "@/lib/types";
import { Icon, ThemeToggle, Modal } from "./system";
import { Badge } from "./ui";

type NavItem = { href: string; label: string; icon: string };
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/projects", label: "Projects", icon: "grid" },
  { href: "/team", label: "Team", icon: "users" },
  { href: "/bridge", label: "Claude Bridge", icon: "spark" },
  { href: "/how-it-works", label: "How it works", icon: "flow" },
];

export function AppShell({ projects, engine, children }: { projects: Project[]; engine: "anthropic-api" | "cowork"; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("sidebar") === "collapsed"); } catch { /* ignore */ }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const toggleSidebar = () => {
    setCollapsed((c) => { try { localStorage.setItem("sidebar", !c ? "collapsed" : "open"); } catch { /* ignore */ } return !c; });
  };

  const current = useMemo(() => {
    const m = path.match(/^\/projects\/([^/]+)/);
    return m ? projects.find((p) => p.id === m[1]) ?? null : null;
  }, [path, projects]);

  const items = useMemo(() => {
    const base = [
      ...NAV.map((n) => ({ label: n.label, href: n.href, group: "Pages", icon: n.icon })),
      { label: "New project", href: "/projects/new", group: "Actions", icon: "plus" },
      ...projects.flatMap((p) => [
        { label: p.name, href: `/projects/${p.id}`, group: "Projects", icon: "grid" },
        { label: `${p.name} · Scrum board`, href: `/projects/${p.id}/scrum`, group: "Projects", icon: "board" },
        { label: `${p.name} · Claude`, href: `/projects/${p.id}/claude`, group: "Projects", icon: "spark" },
      ]),
    ];
    const s = q.trim().toLowerCase();
    return s ? base.filter((i) => i.label.toLowerCase().includes(s)) : base;
  }, [projects, q]);

  const crumbs: Array<{ label: string; href?: string }> = [{ label: "Home", href: "/" }];
  if (path.startsWith("/projects/new")) crumbs.push({ label: "Projects", href: "/projects" }, { label: "New" });
  else if (current) {
    crumbs.push({ label: "Projects", href: "/projects" }, { label: current.name, href: `/projects/${current.id}` });
    const tail = path.split("/")[3];
    if (tail) crumbs.push({ label: tail[0].toUpperCase() + tail.slice(1) });
  } else {
    const n = NAV.find((x) => x.href !== "/" && path.startsWith(x.href));
    if (n) crumbs.push({ label: n.label });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${collapsed ? "w-16" : "w-64"}`}>
        <div className={`flex h-14 items-center border-b border-border ${collapsed ? "justify-center" : "gap-2 px-4"}`}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg"><Icon name="bolt" /></span>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-accent">Smart IT by Shiv</div>
              <div className="text-sm font-bold text-fg">Console</div>
            </div>
          )}
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href) && !(n.href === "/projects" && current);
            return (
              <Link key={n.href} href={n.href} title={n.label} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-accent/10 font-medium text-accent" : "text-fg-2 hover:bg-surface-2 hover:text-fg"} ${collapsed ? "justify-center px-0" : ""}`}>
                <Icon name={n.icon} /> {!collapsed && n.label}
              </Link>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="mt-2 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>Projects</span>
            <Link href="/projects/new" className="text-accent hover:underline">+ New</Link>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2">
          {projects.map((p) => {
            const active = current?.id === p.id;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} title={p.name} className={`mb-0.5 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${active ? "bg-surface-2 font-medium text-fg" : "text-fg-2 hover:bg-surface-2"} ${collapsed ? "justify-center px-0" : ""}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.currentPhase === 8 ? "bg-good" : "bg-accent"}`} />
                {!collapsed && <span className="flex-1 truncate">{p.name}</span>}
                {!collapsed && <span className="text-[10px] text-muted">P{p.currentPhase}</span>}
              </Link>
            );
          })}
        </div>
        <button onClick={toggleSidebar} className="flex h-10 items-center justify-center border-t border-border text-muted hover:text-fg" aria-label="Toggle sidebar">
          <Icon name="chevron" className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <nav className="flex min-w-0 items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <Icon name="chevron" className="h-3 w-3 text-muted-2" />}
                {c.href ? <Link href={c.href} className="truncate hover:text-fg">{c.label}</Link> : <span className="truncate font-medium text-fg">{c.label}</span>}
              </span>
            ))}
          </nav>
          <div className="flex-1" />
          <button onClick={() => setPalette(true)} className="hidden items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted hover:text-fg md:flex">
            <Icon name="search" /> Search or jump to… <span className="kbd ml-2">⌘K</span>
          </button>
          <Link href="/bridge" className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-2 hover:bg-surface-2" title="Claude Bridge status">
            <span className={`h-2 w-2 rounded-full ${engine === "anthropic-api" ? "bg-good" : "bg-accent"} animate-pulse`} />
            {engine === "anthropic-api" ? "Engine: Claude API" : "Engine: Cowork"}
          </Link>
          <ThemeToggle />
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent" title="Shivhari">SL</span>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {palette && (
        <Modal title={<span className="flex items-center gap-2"><Icon name="search" /> Jump to</span>} onClose={() => { setPalette(false); setQ(""); }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a page or project name…" className="input mb-3" onKeyDown={(e) => { if (e.key === "Enter" && items[0]) { router.push(items[0].href); setPalette(false); setQ(""); } }} />
          <ul className="max-h-80 overflow-y-auto">
            {items.slice(0, 30).map((i) => (
              <li key={i.href + i.label}>
                <button onClick={() => { router.push(i.href); setPalette(false); setQ(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-2 hover:text-fg">
                  <Icon name={i.icon} className="h-4 w-4 text-muted" /> <span className="flex-1 truncate">{i.label}</span> <Badge>{i.group}</Badge>
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches.</li>}
          </ul>
        </Modal>
      )}
    </div>
  );
}
