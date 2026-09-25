import { notFound } from "next/navigation";
import { getProject } from "@/lib/repo";
import { getCommand, listActivity } from "@/lib/bridge";
import { PIPELINE } from "@/lib/pipeline";
import { personas as teamPersonas } from "@/lib/team";
import { RunView } from "@/components/RunView";

export default async function RunPage({ params }: { params: Promise<{ id: string; cmd: string }> }) {
  const { id, cmd } = await params;
  const project = getProject(id);
  const command = getCommand(cmd);
  if (!project || !command) notFound();
  return <RunView projectId={id} command={command} activity={listActivity({ commandId: cmd, limit: 500 })} phases={PIPELINE.phases} personas={teamPersonas()} />;
}
