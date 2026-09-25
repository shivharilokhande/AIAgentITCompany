import { notFound } from "next/navigation";
import { getProject } from "@/lib/repo";
import { listActivity, listCommands } from "@/lib/bridge";
import { engineInfo } from "@/lib/settings";
import { ChatPanel } from "@/components/ChatPanel";
import { Badge } from "@/components/ui";

export default async function ProjectClaudePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <Badge tone={project.source === "claude" ? "good" : "neutral"}>{project.source === "claude" ? "synced from Claude" : "manual"}</Badge>
        {project.lastSyncedAt && <span>last sync {new Date(project.lastSyncedAt).toLocaleString()}</span>}
        <span>repo: <span className="mono text-fg-2">{project.repoPath || "— set in Settings"}</span></span>
      </div>
      <ChatPanel project={project} engine={engineInfo()} initialActivity={listActivity({ projectId: id, limit: 600 })} initialCommands={listCommands({ projectId: id, limit: 100 })} />
    </div>
  );
}
