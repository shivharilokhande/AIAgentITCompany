import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getPhases } from "@/lib/repo";
import { phaseProgress } from "@/lib/metrics";
import { PHASES } from "@/lib/pipeline";
import { Badge } from "@/components/ui";
import { ProjectTabs } from "./tabs";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const phases = getPhases(id);
  const progress = phaseProgress(phases);
  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{project.name}</h1>
          <p className="max-w-3xl text-sm text-slate-400">“{project.idea}”</p>
        </div>
        <div className="flex items-center gap-2">
          {project.source === "claude" && <Badge tone="good" className="gap-1">● synced from Claude</Badge>}
          <Badge tone={project.mode === "incremental" ? "warn" : "neutral"}>{project.mode}</Badge>
          <Badge tone={progress === 100 ? "good" : "accent"}>Phase {project.currentPhase} · {PHASES.find((p) => p.n === project.currentPhase)?.name} · {progress}%</Badge>
        </div>
      </header>
      <ProjectTabs id={id} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
