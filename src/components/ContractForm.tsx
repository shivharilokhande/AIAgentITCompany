"use client";
// src/components/ContractForm.tsx
// One structured contract (A/B/C). Fields come from PIPELINE.contracts[kind]; values are stored as JSON.
import { ActionForm } from "@/components/system";
import { useMemo, useState } from "react";
import type { Contract, ContractFieldDef, ContractKind } from "@/lib/types";
import { saveContractAction } from "@/lib/actions";
import { Badge } from "./ui";

type Props = {
  projectId: string;
  kind: ContractKind;
  title: string;
  owner: string;
  feeds: string;
  fields: ContractFieldDef[];
  contract: Contract;
};

export function ContractForm({ projectId, kind, title, owner, feeds, fields, contract }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.key] = contract.fields[f.key] ?? "";
    return v;
  });
  const filled = useMemo(() => fields.filter((f) => (values[f.key] ?? "").trim().length > 0).length, [fields, values]);
  const pct = Math.round((filled / fields.length) * 100);

  return (
    <ActionForm action={saveContractAction} className="card p-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="kind" value={kind} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-50">{title}</h3>
          <p className="text-xs text-slate-400">
            Owner: {owner} · feeds <span className="mono text-accent">{feeds}</span>
            {contract.updatedAt && <> · saved {new Date(contract.updatedAt).toLocaleString()}</>}
          </p>
        </div>
        <Badge tone={pct === 100 ? "good" : pct > 0 ? "warn" : "neutral"}>{filled}/{fields.length} fields · {pct}%</Badge>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const wide = f.type !== "text";
          const val = values[f.key] ?? "";
          const lines = f.type === "list" ? val.split(/\r?\n/).filter((x) => x.trim()).length : 0;
          return (
            <div key={f.key} className={wide ? "md:col-span-2" : ""}>
              <label className="label flex items-center justify-between" htmlFor={`f_${f.key}`}>
                <span>
                  {f.label} {f.type === "mermaid" && <span className="ml-1 text-accent">mermaid</span>}
                </span>
                {f.type === "list" && <span className="text-slate-500">{lines} items</span>}
              </label>
              {f.type === "text" ? (
                <input id={`f_${f.key}`} name={`f_${f.key}`} value={val} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="input" placeholder={f.hint} />
              ) : (
                <textarea
                  id={`f_${f.key}`}
                  name={`f_${f.key}`}
                  value={val}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  rows={f.type === "mermaid" ? 8 : f.type === "list" ? 5 : 3}
                  className={`input ${f.type === "mermaid" || f.type === "list" ? "mono text-xs" : ""}`}
                  placeholder={f.hint}
                />
              )}
              <p className="mt-1 text-[11px] text-slate-500">{f.hint}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">SOP-1: fill every field. If not applicable write <span className="mono">N/A — reason</span>. Never skip.</p>
        <button className="btn-primary" type="submit">Save Contract {kind}</button>
      </div>
    </ActionForm>
  );
}
