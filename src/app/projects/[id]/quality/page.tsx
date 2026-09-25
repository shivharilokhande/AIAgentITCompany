import { notFound } from "next/navigation";
import { getProject, listReviews, getGate, listAdrs, getSummary } from "@/lib/repo";
import { PIPELINE } from "@/lib/pipeline";
import { ReviewLog, CodeSummaryCard } from "@/components/ReviewLog";
import { QualityGate } from "@/components/QualityGate";
import { AdrList, DeployCard } from "@/components/AdrList";

export default async function QualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <ReviewLog projectId={id} reviews={listReviews(id)} />
        <CodeSummaryCard projectId={id} summary={getSummary(id)} />
      </div>
      <div className="space-y-4">
        <QualityGate projectId={id} defs={PIPELINE.gate} checks={getGate(id)} />
        <AdrList projectId={id} adrs={listAdrs(id)} />
        <DeployCard project={project} />
      </div>
    </div>
  );
}
