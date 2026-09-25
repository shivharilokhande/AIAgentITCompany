import { notFound } from "next/navigation";
import { getProject, getPhases, listStories, listSprints, listReviews, getGate, getSummary } from "@/lib/repo";
import { PIPELINE } from "@/lib/pipeline";
import { personas as teamPersonas } from "@/lib/team";
import { PipelineView } from "@/components/PipelineView";
import { LiveOrgChart } from "@/components/LiveOrgChart";
import { Card, Stat } from "@/components/ui";
import { gateScore, lgtmRatio, pointsByStatus } from "@/lib/metrics";
import { listCommands, listActivity } from "@/lib/bridge";
import { LiveNow } from "@/components/LiveNow";

export default async function ProjectPipeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const phases = getPhases(id);
  const stories = listStories(id);
  const sprints = listSprints(id);
  const active = sprints.find((s) => s.status === "active");
  const pts = pointsByStatus(stories);
  const gate = gateScore(getGate(id));
  const lgtm = lgtmRatio(listReviews(id));
  const summary = getSummary(id);
  const running = listCommands({ projectId: id, status: "running", limit: 1 })[0] ?? null;
  const lastStep = running ? listActivity({ commandId: running.id, limit: 1 })[0] ?? null : null;
  const activeLeads = lastStep?.persona ? [lastStep.persona] : (PIPELINE.phases.find((p) => p.n === project.currentPhase)?.leads ?? []);

  return (
    <div className="space-y-6">
      <LiveNow projectId={id} command={running} lastStep={lastStep} personas={teamPersonas()} phases={PIPELINE.phases} />
      <PipelineView projectId={id} phases={PIPELINE.phases} personas={teamPersonas()} sops={PIPELINE.sops} state={phases} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Active sprint" value={active ? `Sprint ${active.number}` : "—"} sub={active?.goal} />
        <Stat label="Points done / total" value={`${pts.done ?? 0} / ${Object.values(pts).reduce((a, b) => a + b, 0)}`} sub={`${stories.length} stories`} />
        <Stat label="LGTM ratio" value={`${lgtm.ratio}%`} sub={`${lgtm.files} files reviewed`} />
        <Stat label="Quality gate · is-pass" value={`${gate}% · ${summary.isPass}`} sub={summary.cycles ? `${summary.cycles} summarize cycle(s)` : undefined} />
      </div>
      <Card title="Who is on the field right now" right={<span className="text-xs text-slate-400">{lastStep?.persona ? "highlighted = persona working right now" : `highlighted = owners of Phase ${project.currentPhase}`}</span>}>
        <LiveOrgChart projectId={id} personas={teamPersonas()} highlight={activeLeads} initialLive={lastStep?.persona && running ? { persona: lastStep.persona, label: lastStep.step ? lastStep.step[0].toUpperCase() + lastStep.step.slice(1) : "Working", message: lastStep.message } : null} />
      </Card>
    </div>
  );
}
