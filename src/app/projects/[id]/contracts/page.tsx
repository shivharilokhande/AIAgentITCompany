import { getContract } from "@/lib/repo";
import { PIPELINE } from "@/lib/pipeline";
import { consistencyGate } from "@/lib/metrics";
import { ContractForm } from "@/components/ContractForm";
import { Badge, Card } from "@/components/ui";

export default async function ContractsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const A = getContract(id, "A"), B = getContract(id, "B"), C = getContract(id, "C");
  const gate = consistencyGate(B, C);
  return (
    <div className="space-y-4">
      <Card title="SOP-1 · Consistency gate (must pass before Phase 5)" right={<Badge tone={gate.ok ? "good" : "bad"}>{gate.ok ? "PASS" : `${gate.issues.length} issue(s)`}</Badge>}>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-ink-800 p-3"><div className="text-slate-500">B · File List</div><div className="text-lg font-semibold text-slate-100">{gate.fileList.length}</div></div>
          <div className="rounded-lg bg-ink-800 p-3"><div className="text-slate-500">C · Logic Analysis rows</div><div className="text-lg font-semibold text-slate-100">{gate.logicFiles.length}</div></div>
          <div className="rounded-lg bg-ink-800 p-3"><div className="text-slate-500">C · Task List</div><div className="text-lg font-semibold text-slate-100">{gate.taskList.length}</div></div>
        </div>
        {gate.issues.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-bad">
            {gate.issues.slice(0, 12).map((i) => <li key={i}>{i}</li>)}
            {gate.issues.length > 12 && <li>…and {gate.issues.length - 12} more</li>}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-500">Rule: File List == Logic Analysis files == Task List. Fix the documents, never the code. Logic Analysis rows must start with the file path followed by “ — ”.</p>
      </Card>
      <ContractForm projectId={id} kind="A" {...PIPELINE.contracts.A} contract={A} />
      <ContractForm projectId={id} kind="B" {...PIPELINE.contracts.B} contract={B} />
      <ContractForm projectId={id} kind="C" {...PIPELINE.contracts.C} contract={C} />
    </div>
  );
}
