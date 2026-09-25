#!/bin/zsh
# Company Run demo: "What AI features can we add to NamastePOS?" — every persona's step posted live.
# Usage: zsh run-ai-features.sh   (requires the console on http://localhost:3100)
set -e
B=http://localhost:3100/api/bridge
P=NamastePOS
json() { python3 -c 'import json,sys; print(json.dumps(dict(arg.split("=",1) for arg in sys.argv[1:])))' "$@"; }
step() { # persona phase step message [detail]
  python3 - "$1" "$2" "$3" "$4" "${5:-}" <<'PY' > /tmp/step.json
import json,sys
p,ph,st,msg,det=sys.argv[1:6]
print(json.dumps({"project":"NamastePOS","command":open("/tmp/run.id").read().strip(),"actor":"claude","persona":p,"phase":int(ph),"step":st,"type":f"phase.{ph}.{st}","message":msg,"detail":det}))
PY
  curl -s -X POST $B/activity -H 'content-type: application/json' --data @/tmp/step.json >/dev/null; sleep ${PACE:-1.2}
}
patch() { curl -s -X PATCH $B/projects/$P -H 'content-type: application/json' --data @"$1" >/dev/null; }

# 0. command (as if asked in Cowork)
CMD=$(curl -s -X POST $B/commands -H 'content-type: application/json' -d '{"text":"What AI features can we add to NamastePOS? Analyse, prioritise, plan and estimate them end to end.","kind":"ask","project":"NamastePOS","source":"cowork"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['command']['id'])")
echo $CMD > /tmp/run.id; echo "run: http://localhost:3100/projects/8e05dab2-4d16-42e6-bc03-3bd52986b1f3/runs/$CMD"
curl -s "$B/commands?claim=1&project=$P" >/dev/null

# 1. Vision Lock — Founder
step founder 1 think "Reading the ask against the vision: 'Run your restaurant, not your software.' AI only qualifies if it removes owner effort during a rush or at day-end." "Constraints I am holding: zero human interaction, no unsubstantiated claims in public copy, ₹ pricing, Claude API cost must stay under ~₹0.50/call at our volume. The question is not 'what AI can we do' but 'what AI pays back fastest for a single-outlet Indian restaurant'."
step founder 1 decide "Scope: evaluate 7 candidate AI features, rank by payback, plan the top ones into Sprint 15. Non-AI Sprint 14 stays first (already active)." "v1 must-have = features that shorten onboarding or daily ops. v2 = anything needing third-party API access we do not yet have (GBP reviews)."

# 2. Strategy — CTO / CFO / CPO
step cto 2 analyze "Every candidate runs on the Claude API from the existing Node 22 backend; no new infra. Read-only tenant-scoped SQL views are the one new primitive (needed for ask-your-data)." "Options weighed: (a) call Claude directly from the API — simplest, chosen; (b) a separate AI service — premature at this volume; (c) on-device models — no, Flutter footprint. Safety: allowlisted views + row-level tenant filter; never let generated SQL touch write paths."
step cfo 2 analyze "Cost model: ₹0.05–0.50 per call. Menu import ≈ 1 call per onboarding; daily digest ≈ 1 call/tenant/day; ask-your-data ≈ 5–20 calls/tenant/day. At 100 tenants that is well under ₹5k/month." "Budget: one 2-week sprint (Sprint 15, 33 pts). Abort trigger: if any feature exceeds 3 days, cut to the next."
step cpo 2 decide "MVP order by payback: 1 menu import (kills the #1 onboarding drop-off), 2 Hinglish WhatsApp digest (daily habit), 9-adjacent: 5 voice matching (fixes a known weakness). Then 3 ask-your-data, 4 wastage alerts, 7 support bot. 6 review replies is v2 (needs GBP API)." "Acceptance: menu import — 80-item photo menu becomes editable items with GST slab in < 60 s; digest — one message by 23:30 IST with sales, delta vs yesterday, top items, refunds, open tables."

# 3. Specification — BA / Product / Design
step ba 3 write "Wrote 7 user stories and a P0/P1/P2 requirement pool for the AI lane." "As an owner onboarding, I want to photograph my menu so that items, prices, variants and GST slab are prefilled.
As an owner, I want a 23:30 Hinglish WhatsApp summary so that I know today's sales without opening the dashboard.
As an owner, I want to ask 'last month Sunday sales?' in the dashboard so that I get an answer and a chart without spreadsheets.
As a manager, I want a 'you run out of paneer by Saturday' alert so that I reorder in time.
As a captain, I want 'do paneer tikka, ek coke bina barf' matched correctly so that voice ordering is usable in a rush.
As an owner, I want draft replies to Google/Zomato reviews so that I answer in minutes.
As a prospect, I want a support bot on the landing page so that I get answers before signing up."
step dir-prod 3 write "Definition of Done for AI stories: prompt + eval set checked in, cost per call logged, tenant isolation test, Hinglish output reviewed by a native speaker, feature-flagged per plan (Pro+)." "Risk register: (1) hallucinated menu prices → always show a review screen before save; (2) SQL generation escaping tenant scope → allowlisted views only, integration test that tries to; (3) WhatsApp template approval latency → start the approval now."
step dir-design 3 design "Screens: Menu Import (camera → parsing state → review table with per-row confidence → save); Ask-your-data (chat drawer in dashboard with answer + chart + 'show SQL'); Digest (WhatsApp template preview with variables)." "Review table shows low-confidence cells highlighted amber; nothing saves without an explicit 'Add 82 items' tap."

# 4. Architecture — Architect + CTO
step architect 4 design "Contract B delta: new module namastepos_backend/src/ai/ with claudeClient.ts, menuImport.ts, digest.ts, askData.ts, voiceMatch.ts; read-only views v_sales_daily, v_items_margin, v_inventory_burn." "classDiagram
  class ClaudeClient { +complete(system, user, maxTokens) +costLog(tenantId, tokens) }
  class MenuImport { +fromImage(tenantId, bytes) ParsedItem[] }
  class Digest { +build(tenantId, date) string  +send(tenantId) }
  class AskData { +answer(tenantId, question) {sql, rows, chart} }
  class VoiceMatch { +match(tenantId, transcript) OrderLine[] }
  MenuImport --> ClaudeClient
  Digest --> ClaudeClient
  AskData --> ClaudeClient
  VoiceMatch --> ClaudeClient
  AskData ..> ReadOnlyViews"
step architect 4 write "Contract C delta: task order claudeClient → views migration → menuImport → digest → voiceMatch → askData → tests. Shared knowledge: all prompts in src/ai/prompts/*.md, every call logged to ai_calls(tenant_id, feature, tokens_in, tokens_out, cost_paise)." "Required packages: none new (fetch to api.anthropic.com). Feature flags: ai_menu_import, ai_digest, ai_ask_data, ai_voice — gated Pro+."
step cto 4 review "Reviewed Contract B: LGTM. One change — AskData must run generated SQL through a validator that rejects anything not SELECT on v_* views; add it to the classDiagram as SqlGuard." "Also: cap askData at 20 calls/tenant/day on Growth, unlimited on Enterprise."

# 5. Sprint Execution — Scrum Master + engineers (estimate & plan only; code is Sprint 15 work)
step scrum 5 write "Planned Sprint 15 (33 pts, 2026-09-25 → 10-08): 1 menu import 8, 2 digest 3, 5 voice 3, 3 ask-your-data 8, 4 wastage 3, 7 support bot 5, 6 review replies 3 (v2 unless GBP access lands)." "Capacity check: S1 velocity 20, S14 planned 25 → 33 is aggressive; CFO abort rule applies — if menu import + ask-your-data both slip past day 3, review replies and support bot move to Sprint 16."
step be-senior 5 analyze "Menu import: image → Claude vision → JSON items; the hard part is variant detection (Half/Full, Regular/Large). Plan a two-pass prompt: extract rows, then normalise variants. 8 pts stands." "Prototype note: 40 KB JPEG of an 80-item menu is ~1.2k image tokens; well inside budget."
step be 5 analyze "Digest and voice reuse the existing WhatsApp sender and the existing speech transcript path — thin features, 3 pts each. Ask-your-data needs the SqlGuard + views migration first; 8 pts." ""
step fe 5 design "Dashboard: chat drawer component with streaming answer and a Recharts bar/line; Flutter: menu import review table with amber low-confidence cells. Reusing existing design tokens." ""

# 6. Quality Gate — QA
step qa 6 test "Test plan: (1) tenant-isolation test that asks for another tenant's sales and must get zero rows; (2) SqlGuard rejects UPDATE/DELETE/non-view SELECT; (3) menu import golden set of 5 real menus with expected item counts ±2; (4) digest snapshot test in Hinglish; (5) cost-per-call assertion < ₹0.50." "Gate impact: Check 5 (security) gains the isolation + SqlGuard tests; Check 9 (coverage) needs the golden set checked in."

# 7. Deployment — DevOps
step devops 7 deploy "Deployment notes: add ANTHROPIC_API_KEY to Render env; new migration for v_* views and ai_calls table (forward-only #109); feature flags default OFF; enable per tenant after eval set passes." "Rollback: flags off. No schema rollback needed — views are additive. Monitoring: ai_calls daily cost line added to the weekly ops digest."

# publish structured outputs to the pool
cat > /tmp/ai-bundle.json <<'JSON'
{"requirements":[
 {"priority":"P1","text":"AI menu import from photo/PDF/Zomato link with review-before-save (Pro+)"},
 {"priority":"P1","text":"Owner daily Hinglish WhatsApp digest at 23:30 IST"},
 {"priority":"P1","text":"Ask-your-data chat over read-only tenant-scoped views with SqlGuard"},
 {"priority":"P2","text":"AI review reply drafts (needs Google Business Profile API access)"}],
 "adrs":[
 {"title":"AI features call the Claude API directly from the Node backend","decision":"No separate AI service at current volume; all prompts versioned in src/ai/prompts, every call logged to ai_calls with cost in paise. Revisit if >1k tenants."},
 {"title":"Ask-your-data runs only against allowlisted read-only views","decision":"Generated SQL passes SqlGuard (SELECT on v_* only, tenant filter injected server-side). Never touches write paths. Integration test attempts cross-tenant read and must return zero rows."}],
 "gate":[{"check":5,"status":"pending","note":"Add tenant-isolation + SqlGuard tests when AI lane lands (Sprint 15)"}]}
JSON
patch /tmp/ai-bundle.json
step scrum 5 write "Published to the pool: 4 requirements, 2 ADRs, gate note. Sprint 15 stories were already planned (7 stories, 33 pts)." ""

# 8. Delivery — Founder
curl -s -X PATCH $B/commands/$CMD -H 'content-type: application/json' --data @- <<'JSON' >/dev/null
{"status":"done","result":"**Decision:** 7 AI features evaluated; 6 planned into Sprint 15 (33 pts, after Sprint 14), 1 deferred to v2.\n\n**Order by payback:** 1 Menu import from photo (8) → 2 Hinglish WhatsApp digest (3) → 5 Voice item matching (3) → 3 Ask-your-data with SqlGuard (8) → 4 Wastage alerts (3) → 7 Support bot (5). **Deferred:** 6 Review replies (needs GBP API).\n\n**Architecture:** new src/ai/ module calling Claude directly; read-only v_* views + SqlGuard; ai_calls cost log; feature-flagged Pro+. **Cost:** < ₹5k/month at 100 tenants.\n\n**Known gaps / founder actions:** WhatsApp template approval (start now), ANTHROPIC_API_KEY on Render, GBP API access for review replies.\n\n**CFO rule:** if menu import + ask-your-data both slip past day 3, support bot and review replies move to Sprint 16."}
JSON
echo "done"
