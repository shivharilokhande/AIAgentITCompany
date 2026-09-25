// src/components/ReviewLog.tsx
// SOP-4 per-file LGTM/LBTM log + SOP-5 code summary / is-pass.
import { ActionForm } from "@/components/system";
import type { FileReview, CodeSummary } from "@/lib/types";
import { addReviewAction, deleteReviewAction, saveSummaryAction } from "@/lib/actions";
import { lgtmRatio } from "@/lib/metrics";
import { Badge, Card, Empty, ProgressBar } from "./ui";

export function ReviewLog({ projectId, reviews }: { projectId: string; reviews: FileReview[] }) {
  const m = lgtmRatio(reviews);
  return (
    <Card
      title="SOP-4 · Per-file review log (LGTM / LBTM)"
      right={<Badge tone={m.ratio === 100 ? "good" : m.ratio >= 60 ? "warn" : "bad"}>{m.lgtm}/{m.files} files LGTM · {m.ratio}%</Badge>}
    >
      <ProgressBar value={m.ratio} tone={m.ratio === 100 ? "good" : m.ratio >= 60 ? "warn" : "bad"} />
      <p className="mt-2 text-xs text-slate-400">Latest verdict per file counts. Max k=2 passes; a file still LBTM after pass 2 is accepted with its Actions logged as TODOs.</p>
      {reviews.length === 0 ? (
        <div className="mt-3"><Empty>No reviews logged yet.</Empty></div>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-ink-900 text-xs uppercase tracking-wide text-slate-400">
              <tr><th className="pb-2">File</th><th className="pb-2">Verdict</th><th className="pb-2">Pass</th><th className="pb-2">Actions / notes</th><th className="pb-2">When</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {reviews.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="mono py-2 pr-2 text-xs text-slate-100">{r.file}</td>
                  <td className="py-2 pr-2"><Badge tone={r.verdict === "LGTM" ? "good" : "bad"}>{r.verdict}</Badge></td>
                  <td className="py-2 pr-2 text-xs text-slate-300">{r.pass}/2</td>
                  <td className="py-2 pr-2 text-xs text-slate-400">{r.notes || "—"}</td>
                  <td className="py-2 pr-2 text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    <ActionForm action={deleteReviewAction} confirm="Delete this item? This cannot be undone." success="Deleted">
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs text-slate-500 hover:text-bad" type="submit" aria-label="Delete review">✕</button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ActionForm action={addReviewAction} success="Added" resetOnSuccess className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_80px_1fr_auto]">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="file" className="input mono text-xs" placeholder="src/lib/repo.ts" required />
        <select name="verdict" className="input" defaultValue="LGTM"><option>LGTM</option><option>LBTM</option></select>
        <select name="pass" className="input" defaultValue="1" aria-label="Pass"><option value="1">pass 1</option><option value="2">pass 2</option></select>
        <input name="notes" className="input" placeholder="Actions (Q1–Q6 findings)" />
        <button className="btn-primary" type="submit">Log</button>
      </ActionForm>
    </Card>
  );
}

export function CodeSummaryCard({ projectId, summary }: { projectId: string; summary: CodeSummary }) {
  const tone = summary.isPass === "YES" ? "good" : summary.isPass === "NO" ? "bad" : "neutral";
  return (
    <Card title="SOP-5 · Code summary → is-pass" right={<Badge tone={tone}>is-pass: {summary.isPass}</Badge>}>
      <p className="mb-3 text-xs text-slate-400">"Does the summary indicate anything that needs to be done?" YES = nothing left. NO = TODOs become the first stories of the next iteration. Max 2 cycles per sprint.</p>
      <ActionForm action={saveSummaryAction} className="space-y-2">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="isPass">Verdict</label>
            <select id="isPass" name="isPass" className="input" defaultValue={summary.isPass}><option>pending</option><option>YES</option><option>NO</option></select>
          </div>
          <div>
            <label className="label" htmlFor="cycles">Summarize cycles used (max 2)</label>
            <input id="cycles" name="cycles" type="number" min={0} max={2} defaultValue={summary.cycles} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="todos">TODOs (file → what must change and why)</label>
          <textarea id="todos" name="todos" rows={4} defaultValue={summary.todos} className="input mono text-xs" placeholder='{ "src/x.ts": "implement deleteCard" }' />
        </div>
        <button className="btn-primary" type="submit">Save summary</button>
      </ActionForm>
    </Card>
  );
}
