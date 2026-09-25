import { ActionForm } from "@/components/system";
import { createProjectAction } from "@/lib/actions";
import { Card } from "@/components/ui";

export default function NewProject() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-50">New project</h1>
      <p className="mb-6 text-sm text-slate-400">One-line idea in. The company takes it from Phase 1.</p>
      <Card>
        <ActionForm action={createProjectAction} success="Added" resetOnSuccess className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Project name</label>
            <input id="name" name="name" className="input" placeholder="Invoicing SaaS" required maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="idea">The idea (verbatim — becomes “Original Requirements”)</label>
            <textarea id="idea" name="idea" rows={3} className="input" placeholder="I want a SaaS invoicing platform with Stripe billing" required maxLength={2000} />
          </div>
          <div>
            <label className="label" htmlFor="mode">Mode</label>
            <select id="mode" name="mode" className="input" defaultValue="greenfield">
              <option value="greenfield">Greenfield — full 8 phases</option>
              <option value="incremental">Incremental (SOP-6) — existing codebase</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="repoPath">Project folder on this machine (optional)</label>
            <input id="repoPath" name="repoPath" className="input mono text-xs" placeholder="/Users/shiv/AI Development/MyProject" />
            <p className="mt-1 text-[11px] text-muted">If set, Claude can read the codebase to fetch complete details.</p>
          </div>
          <button className="btn-primary" type="submit">Create & start Phase 1</button>
        </ActionForm>
      </Card>
    </div>
  );
}
