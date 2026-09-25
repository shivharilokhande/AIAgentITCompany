import Link from "next/link";
import { listProjects, getPhases, listStories, listSprints, getGate, listReviews } from "@/lib/repo";
import { phaseProgress, gateScore, lgtmRatio } from "@/lib/metrics";
import { PHASES } from "@/lib/pipeline";
import { Badge, Card, Empty, ProgressBar } from "@/components/ui";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ sort?: string; q?: string }> }) {
  const { sort = "created", q = "" } = await searchParams;
  let rows = listProjects().map((p) => {
    const stories = listStories(p.id);
    const active = listSprints(p.id).find((s) => s.status === "active");
    return { p, progress: phaseProgress(getPhases(p.id)), phase: PHASES.find((x) => x.n === p.currentPhase)?.name ?? "", stories: stories.length, done: stories.filter((s) => s.status === "done").length, sprint: active?.number ?? null, gate: gateScore(getGate(p.id)), lgtm: lgtmRatio(listReviews(p.id)).ratio };
  });
  if (q) rows = rows.filter((r) => (r.p.name + r.p.idea + r.p.tags).toLowerCase().includes(q.toLowerCase()));
  rows.sort((a, b) => sort === "name" ? a.p.name.localeCompare(b.p.name) : sort === "progress" ? b.progress - a.progress : sort === "gate" ? b.gate - a.gate : b.p.createdAt.localeCompare(a.p.createdAt));
  const th = (key: string, label: string) => <th><Link href={`/projects?sort=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`hover:text-fg ${sort === key ? "text-accent" : ""}`}>{label}{sort === key ? " ↓" : ""}</Link></th>;
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-fg">Projects</h1><p className="text-sm text-muted">{rows.length} project{rows.length === 1 ? "" : "s"}</p></div>
        <div className="flex gap-2">
          <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Filter…" className="input w-56" /><input type="hidden" name="sort" value={sort} /><button className="btn-ghost" type="submit">Filter</button></form>
          <Link href="/projects/new" className="btn-primary">+ New project</Link>
        </div>
      </header>
      <Card>
        {rows.length === 0 ? <Empty>No projects match.</Empty> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>{th("name", "Project")}<th>Idea</th>{th("progress", "Pipeline")}<th>Phase</th><th>Stories</th><th>Sprint</th>{th("gate", "Gate")}<th>LGTM</th><th>Source</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.p.id}>
                    <td className="font-medium text-fg"><Link href={`/projects/${r.p.id}`} className="hover:text-accent">{r.p.name}</Link>{r.p.tags && <div className="mt-0.5 flex flex-wrap gap-1">{r.p.tags.split(",").filter(Boolean).map((t) => <Badge key={t}>{t.trim()}</Badge>)}</div>}</td>
                    <td className="max-w-xs truncate text-muted" title={r.p.idea}>{r.p.idea}</td>
                    <td className="w-40"><div className="flex items-center gap-2"><div className="flex-1"><ProgressBar value={r.progress} tone={r.progress === 100 ? "good" : "accent"} /></div><span className="text-xs text-muted">{r.progress}%</span></div></td>
                    <td><Badge tone={r.progress === 100 ? "good" : "accent"}>P{r.p.currentPhase} · {r.phase}</Badge></td>
                    <td className="text-fg-2">{r.done}/{r.stories}</td>
                    <td className="text-fg-2">{r.sprint ? `S${r.sprint}` : "—"}</td>
                    <td className="text-fg-2">{r.gate}%</td>
                    <td className="text-fg-2">{r.lgtm}%</td>
                    <td><Badge tone={r.p.source === "claude" ? "good" : "neutral"}>{r.p.source}</Badge></td>
                    <td className="text-right"><Link href={`/projects/${r.p.id}/claude`} className="text-xs text-accent hover:underline">Claude</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
