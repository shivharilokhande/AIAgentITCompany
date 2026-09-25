import { ActionForm } from "@/components/system";
import Link from "next/link";
import { listProjects, getPhases, listStories, listSprints, getGate, listReviews } from "@/lib/repo";
import { phaseProgress, gateScore, lgtmRatio } from "@/lib/metrics";
import { PHASES } from "@/lib/pipeline";
import { Badge, Card, ProgressBar, Stat, Empty } from "@/components/ui";
import { deleteProjectAction } from "@/lib/actions";

export default function Dashboard() {
  const projects = listProjects();
  const rows = projects.map((p) => {
    const phases = getPhases(p.id);
    const stories = listStories(p.id);
    const sprints = listSprints(p.id);
    const active = sprints.find((s) => s.status === "active");
    const inActive = stories.filter((s) => active && s.sprintId === active.id);
    return {
      p, progress: phaseProgress(phases), phaseName: PHASES.find((x) => x.n === p.currentPhase)?.name ?? "",
      stories: stories.length, done: stories.filter((s) => s.status === "done").length,
      sprint: active, sprintPts: inActive.reduce((a, s) => a + s.points, 0), sprintDone: inActive.filter((s) => s.status === "done").reduce((a, s) => a + s.points, 0),
      gate: gateScore(getGate(p.id)), lgtm: lgtmRatio(listReviews(p.id)).ratio,
    };
  });
  const totals = {
    projects: projects.length,
    delivered: rows.filter((r) => r.progress === 100).length,
    activeSprints: rows.filter((r) => r.sprint).length,
    stories: rows.reduce((a, r) => a + r.stories, 0),
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Dashboard</h1>
          <p className="text-sm text-slate-400">Every project runs the same 8-phase pipeline. One idea in, one product out.</p>
        </div>
        <div className="flex gap-2"><Link href="/bridge" className="btn-ghost">Claude Bridge</Link><Link href="/projects/new" className="btn-primary">+ New project</Link></div>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Projects" value={totals.projects} sub={`${totals.delivered} delivered`} />
        <Stat label="Active sprints" value={totals.activeSprints} />
        <Stat label="Stories tracked" value={totals.stories} />
        <Stat label="Method" value="8 · 15 · 10" sub="phases · personas · SOPs" />
      </div>
      {rows.length === 0 ? (
        <Empty>No projects. <Link href="/projects/new" className="text-accent underline">Create the first one</Link> from a one-line idea.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ p, progress, phaseName, stories, done, sprint, sprintPts, sprintDone, gate, lgtm }) => (
            <Card key={p.id} title={<Link href={`/projects/${p.id}`} className="hover:text-accent">{p.name}</Link>} right={<Badge tone={progress === 100 ? "good" : "accent"}>Phase {p.currentPhase} · {phaseName}</Badge>}>
              <p className="mb-3 line-clamp-2 text-sm text-slate-400">“{p.idea}”</p>
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Pipeline</span><span>{progress}%</span></div>
              <ProgressBar value={progress} tone={progress === 100 ? "good" : "accent"} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-ink-800 p-2"><div className="text-slate-500">Stories</div><div className="text-slate-100">{done}/{stories} done</div></div>
                <div className="rounded-lg bg-ink-800 p-2"><div className="text-slate-500">Sprint</div><div className="text-slate-100">{sprint ? `S${sprint.number} · ${sprintDone}/${sprintPts} pts` : "—"}</div></div>
                <div className="rounded-lg bg-ink-800 p-2"><div className="text-slate-500">Gate / LGTM</div><div className="text-slate-100">{gate}% / {lgtm}%</div></div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2 text-xs">
                  <Link href={`/projects/${p.id}`} className="text-accent hover:underline">Pipeline</Link>
                  <Link href={`/projects/${p.id}/scrum`} className="text-accent hover:underline">Scrum</Link>
                  <Link href={`/projects/${p.id}/quality`} className="text-accent hover:underline">Quality</Link>
                  <Link href={`/projects/${p.id}/claude`} className="text-accent hover:underline">Claude</Link>
                </div>
                <ActionForm action={deleteProjectAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                  <input type="hidden" name="projectId" value={p.id} />
                  <button className="text-[11px] text-slate-600 hover:text-bad" type="submit">delete</button>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
