import { listRequirements, listStories, listSprints } from "@/lib/repo";
import { RequirementPool, StoryBacklog } from "@/components/BacklogPanel";

export default async function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RequirementPool projectId={id} requirements={listRequirements(id)} />
      <StoryBacklog projectId={id} stories={listStories(id)} sprints={listSprints(id)} />
    </div>
  );
}
