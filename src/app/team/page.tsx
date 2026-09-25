import { listTeam, totalLanes, builders } from "@/lib/team";
import { hireAction, updateMemberAction, removeMemberAction } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/system";
import { OrgChart } from "@/components/OrgChart";
import { Avatar, Badge, Card, Stat } from "@/components/ui";

export default function TeamPage() {
  const team = listTeam(true);
  const active = team.filter((m) => m.active);
  const eng = builders();
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-fg">Team</h1>
        <p className="text-sm text-muted">The company roster. Hire engineers to add parallel lanes; set each person's WIP capacity (stories at once). Claude runs one sub-agent per lane, acting as that persona.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="People" value={active.length} sub={`${team.filter((m) => m.source === "hired").length} hired`} />
        <Stat label="Builders" value={eng.length} sub="engineers who take stories" />
        <Stat label="Parallel lanes" value={totalLanes()} sub="sum of builder capacity" />
        <Stat label="QA / DevOps" value={active.filter((m) => m.layer === 5 && /qa|devops/i.test(m.role)).length} sub="own lanes" />
      </div>
      <Card title="Org chart (live roster)"><OrgChart personas={active.map(({ id, name, role, layer, reportsTo, focus, file }) => ({ id, name, role, layer, reportsTo, focus, file }))} /></Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Roster" className="lg:col-span-2">
          <table className="table">
            <thead><tr><th>Person</th><th>Role</th><th>Specialty</th><th>Capacity</th><th>Status</th><th /></tr></thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className={m.active ? "" : "opacity-50"}>
                  <td><div className="flex items-center gap-2"><Avatar name={m.name} size={24} /><div><div className="font-medium text-fg">{m.name}</div><div className="text-[11px] text-muted">{m.id} · L{m.layer}{m.reportsTo ? ` · reports to ${m.reportsTo}` : ""}</div></div></div></td>
                  <td className="text-fg-2">{m.role}</td>
                  <td>
                    <ActionForm action={updateMemberAction} success="Updated" className="flex gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <input name="specialty" defaultValue={m.specialty} className="input w-52 py-1 text-xs" />
                      <button className="btn-ghost btn-sm" type="submit">save</button>
                    </ActionForm>
                  </td>
                  <td>
                    <ActionForm action={updateMemberAction} success="Capacity updated" className="flex items-center gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <input name="capacity" type="number" min={1} max={5} defaultValue={m.capacity} className="input w-16 py-1 text-xs" aria-label="Capacity" />
                      <button className="btn-ghost btn-sm" type="submit">set</button>
                    </ActionForm>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Badge tone={m.source === "core" ? "neutral" : "accent"}>{m.source}</Badge>
                      <ActionForm action={updateMemberAction} success={m.active ? "Benched" : "Reactivated"}>
                        <input type="hidden" name="id" value={m.id} /><input type="hidden" name="active" value={m.active ? "0" : "1"} />
                        <button className="btn-ghost btn-sm" type="submit">{m.active ? "Bench" : "Activate"}</button>
                      </ActionForm>
                    </div>
                  </td>
                  <td>{m.source === "hired" && (
                    <ActionForm action={removeMemberAction} confirm={`Remove ${m.name} from the company?`} success="Removed">
                      <input type="hidden" name="id" value={m.id} /><button className="text-xs text-muted hover:text-bad" type="submit">remove</button>
                    </ActionForm>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Hire an engineer">
          <ActionForm action={hireAction} success="Hired — they're on the org chart now" resetOnSuccess className="space-y-3">
            <div><label className="label" htmlFor="h-name">Name</label><input id="h-name" name="name" className="input" placeholder="Sameer Khan" required /></div>
            <div><label className="label" htmlFor="h-role">Role</label><input id="h-role" name="role" className="input" placeholder="Flutter Engineer" defaultValue="Engineer" /></div>
            <div><label className="label" htmlFor="h-spec">Specialty (comma-separated)</label><input id="h-spec" name="specialty" className="input" placeholder="Flutter, offline sync, printing" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="h-cap">Capacity (parallel stories)</label><input id="h-cap" name="capacity" type="number" min={1} max={5} defaultValue={1} className="input" /></div>
              <div><label className="label" htmlFor="h-rep">Reports to</label>
                <select id="h-rep" name="reportsTo" className="input" defaultValue="scrum">{active.filter((m) => m.layer <= 4).map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}</select></div>
            </div>
            <input type="hidden" name="layer" value="5" />
            <SubmitButton>Hire</SubmitButton>
            <p className="text-[11px] text-muted">New hires join the Engineers layer and become a dispatch lane immediately. Claude Cowork picks them up as a sub-agent persona on the next dispatch.</p>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
