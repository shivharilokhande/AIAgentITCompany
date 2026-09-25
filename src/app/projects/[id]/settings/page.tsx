import { notFound } from "next/navigation";
import { getProject } from "@/lib/repo";
import { updateProjectAction, deleteProjectAction } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/system";
import { Card } from "@/components/ui";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Project settings" className="lg:col-span-2">
        <ActionForm action={updateProjectAction} success="Project updated" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={p.id} />
          <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={p.name} className="input" required /></div>
          <div><label className="label" htmlFor="owner">Owner</label><input id="owner" name="owner" defaultValue={p.owner} className="input" placeholder="Shivhari" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="idea">Idea / original requirements</label><textarea id="idea" name="idea" defaultValue={p.idea} rows={3} className="input" required /></div>
          <div><label className="label" htmlFor="mode">Mode</label>
            <select id="mode" name="mode" defaultValue={p.mode} className="input"><option value="greenfield">Greenfield</option><option value="incremental">Incremental (SOP-6)</option></select></div>
          <div><label className="label" htmlFor="tags">Tags</label><input id="tags" name="tags" defaultValue={p.tags} className="input" placeholder="saas, pos, marketing" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="repoPath">Repository / project folder on this machine</label>
            <input id="repoPath" name="repoPath" defaultValue={p.repoPath} className="input mono text-xs" placeholder="/Users/shiv/AI Development/NamastePOS" />
            <p className="mt-1 text-[11px] text-muted">Claude reads this folder (CLAUDE.md, README, package manifests, docs) when you ask it to fetch complete details.</p></div>
          <div className="sm:col-span-2 flex justify-end"><SubmitButton>Save settings</SubmitButton></div>
        </ActionForm>
      </Card>
      <Card title="Danger zone">
        <p className="mb-3 text-sm text-muted">Deletes the project and everything under it: phases, backlog, sprints, stories, contracts, reviews, ADRs, commands and activity.</p>
        <ActionForm action={deleteProjectAction} confirm={`Delete “${p.name}” and all of its data? This cannot be undone.`} success="Project deleted">
          <input type="hidden" name="projectId" value={p.id} />
          <button className="btn-danger" type="submit">Delete project</button>
        </ActionForm>
      </Card>
    </div>
  );
}
