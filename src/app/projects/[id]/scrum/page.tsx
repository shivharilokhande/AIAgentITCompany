import { listSprints, listStories } from "@/lib/repo";
import { burndown, velocity } from "@/lib/metrics";
import { SprintPanel } from "@/components/SprintPanel";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Burndown, Velocity } from "@/components/Charts";
import { Badge, Card, Empty } from "@/components/ui";
import { listTeam } from "@/lib/team";
import { laneStatus } from "@/lib/dispatch";
import { LanesBar } from "@/components/LanesBar";

export default async function ScrumPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sprint?: string }> }) {
  const { id } = await params;
  const { sprint: sprintParam } = await searchParams;
  const sprints = listSprints(id);
  const stories = listStories(id);
  const selected = sprints.find((s) => s.id === sprintParam) ?? sprints.find((s) => s.status === "active") ?? sprints[sprints.length - 1] ?? null;
  const boardStories = selected ? stories.filter((s) => s.sprintId === selected.id) : [];
  const team = listTeam();
  const lanes = selected ? laneStatus(id, selected.id) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <SprintPanel projectId={id} sprints={sprints} stories={stories} selectedId={selected?.id ?? null} />
      <div className="space-y-4">
        <Card
          title={selected ? <>Sprint {selected.number} board <span className="font-normal text-slate-400">· {selected.goal}</span></> : "Board"}
          right={selected && <Badge tone={selected.status === "active" ? "accent" : selected.status === "closed" ? "good" : "neutral"}>{selected.status} · {selected.startDate} → {selected.endDate}</Badge>}
        >
          {selected && lanes && <LanesBar projectId={id} sprintId={selected.id} lanes={lanes.lanes} inProgress={lanes.inProg.length} todo={boardStories.filter((s) => s.status === "todo").length} free={lanes.free.filter((f) => f.free > 0).map((f) => ({ name: f.m.name, free: f.free }))} />}
          {selected ? <KanbanBoard projectId={id} sprint={selected} stories={boardStories} sprints={sprints} team={team.filter((m) => m.layer === 5)} /> : <Empty>Create a sprint to open the board.</Empty>}
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={selected ? `Burndown — Sprint ${selected.number}` : "Burndown"}>
            {selected ? <Burndown points={burndown(selected, stories)} /> : <Empty>No sprint.</Empty>}
          </Card>
          <Card title="Velocity — planned vs delivered">
            <Velocity points={velocity(sprints, stories)} />
          </Card>
        </div>
      </div>
    </div>
  );
}
