# Contributing to AgentITCompany

Thanks for taking a look. This project is small enough that one good PR changes it — here's how to make yours land quickly.

## Run it locally

```bash
git clone https://github.com/shivharilokhande/agentitcompany.git && cd agentitcompany
npm install            # Node ≥ 22.13, zero native deps
npm run dev            # http://localhost:3100
zsh data/demo-run.sh   # optional: import the demo project and replay a live company run
```

Before you push: `npm run typecheck && npm test` (Vitest, in‑memory SQLite — fast).

## Where things live

| Want to change… | Look in |
|---|---|
| The methodology (phases, personas, SOPs, contracts, gate) | `src/lib/pipeline.ts` — it's data, not code |
| Database / migrations | `src/lib/db.ts` (additive migrations only), `src/lib/schema.sql`, `src/lib/repo.ts` |
| A mutation from the UI | `src/lib/actions.ts` (Server Actions) |
| The bridge API | `src/app/api/bridge/*` + `src/lib/bridge.ts` |
| LLM providers | `src/lib/llm.ts` (one `chatWith()` switch) + `src/lib/settings.ts` (`PROVIDERS`) |
| Cowork mirroring | `src/lib/cowork.ts` |
| UI | `src/components/*`, pages under `src/app/*` |

## Adding an LLM provider (most-wanted contribution)

1. Add a `ProviderMeta` entry to `PROVIDERS` in `src/lib/settings.ts` (id, name, `kind`, defaults, env var names, a curated model list).
2. If it isn't OpenAI‑compatible, add a `case` to `chatWith()` in `src/lib/llm.ts` and, if it can list models, to `listModels()`.
3. Add a mocked‑fetch test in `tests/unit/settings.test.ts` (see the Ollama and OpenAI examples).
4. Mention it in the README provider table.

## Ground rules

- **Truthful UI.** Nothing in the console may claim something happened that didn't (no fake "done", no invented test counts).
- **Additive migrations.** Never drop or rename a column; existing `smartit.db` files must keep opening.
- **No native dependencies.** `node:sqlite` is the whole database story on purpose.
- **Keep the methodology in data.** If a change to the company needs a code change in a component, it probably belongs in `pipeline.ts` instead.
- One PR, one concern. Small PRs get reviewed the same day.

## Reporting bugs / proposing features

Use the issue templates — they ask for the engine mode (Cowork / API / Ollama), because most behaviour differences come from there. For anything bigger than a bug fix, open a **Discussion** first so we can agree on the shape before you write code.

## Code of conduct

Be kind, assume good intent, and review the code, not the person. That's the whole policy.
