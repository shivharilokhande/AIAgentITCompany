#!/bin/zsh
# Demo company run against the bundled demo project — every persona's step posted live to the console.
# Usage: zsh data/demo-run.sh          (console must be running on http://localhost:3100)
#        PACE=0.3 zsh data/demo-run.sh (faster)
set -e
B=${BRIDGE_URL:-http://localhost:3100/api/bridge}
P="Demo: Clinic Queue"
AUTH=${BRIDGE_TOKEN:+-H "Authorization: Bearer $BRIDGE_TOKEN"}

# 0. make sure the demo project exists
curl -s $AUTH -X POST $B/import -H 'content-type: application/json' --data @"$(dirname "$0")/demo.bundle.json" >/dev/null

# 1. queue a command as if it came from Cowork, then claim it
CMD=$(curl -s $AUTH -X POST $B/commands -H 'content-type: application/json' \
  -d "{\"text\":\"Patients complain the wait estimate is wrong. Analyse and plan a fix.\",\"kind\":\"ask\",\"project\":\"$P\",\"source\":\"cowork\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['command']['id'])")
PID=$(curl -s $AUTH "$B/projects/$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$P")" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('project',d.get('bundle',{}).get('project',{})).get('id',''))")
curl -s $AUTH "$B/commands?claim=1&project=$PID" >/dev/null
echo "run: http://localhost:3100/projects/$PID/runs/$CMD"

step() { # persona phase step message [detail]
  python3 - "$P" "$CMD" "$1" "$2" "$3" "$4" "${5:-}" <<'PY' > /tmp/demo-step.json
import json,sys
proj,cmd,p,ph,st,msg,det=sys.argv[1:8]
print(json.dumps({"project":proj,"command":cmd,"actor":"claude","persona":p,"phase":int(ph),"step":st,"type":f"phase.{ph}.{st}","message":msg,"detail":det}))
PY
  curl -s $AUTH -X POST $B/activity -H 'content-type: application/json' --data @/tmp/demo-step.json >/dev/null; sleep ${PACE:-1.2}
}

step founder   1 think   "Founder: the complaint is about trust, not speed — a wrong estimate is worse than none."
step founder   1 decide  "Scope: fix the estimate model this sprint; per-doctor routing stays v2."
step cto       2 analyze "CTO: estimate is tokens-ahead × fixed 6 min. Real consult time varies 3–15 min; use a rolling median of the last 10 consults." "No new infra — one SQL window function over Token.calledAt deltas."
step cfo       2 decide  "CFO: 3 points, fits Sprint 2. No spend."
step cpo       2 decide  "CPO: acceptance — estimate within ±5 min for 80% of patients over a day."
step ba        3 write   "BA: story 'Rolling-median wait estimate' + requirement P0 'estimate uses observed consult times'."
step dir-prod  3 decide  "Director Product: DoD adds an eval — replay yesterday's tokens, measure error."
step architect 4 design  "Architect: repo.ts gains avgConsultMinutes(clinicId); Board.tsx reads it via the SSE payload. File list unchanged → consistency gate holds." "sequenceDiagram\n  Board->>stream: SSE\n  stream->>repo: avgConsultMinutes()\n  repo->>Postgres: percentile_cont(0.5) over last 10"
step scrum     5 decide  "Scrum Master: assigned to Nikhil (lane 2), 3 pts, due Friday."
step be        5 code    "Nikhil: repo.ts — avgConsultMinutes() with percentile_cont over the last 10 calledAt deltas." "export function avgConsultMinutes(clinicId: string): number { /* SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY delta) FROM (...) */ }"
step be-senior 5 review  "Arun: LGTM — Q1–Q6 pass; suggested a 6-min fallback when fewer than 3 samples."
step qa        6 test    "Divya: replayed 212 tokens from yesterday — 84% within ±5 min (was 41%). 19/19 tests green."
step devops    7 deploy  "Rohan: staging deploy ok; no migration needed."
step founder   8 deliver "Founder: wait estimate now learns from real consults; 84% within ±5 min on replay. Shipped to staging."

cat > /tmp/demo-done.json <<EOF
{"status":"done","result":"## Wait-estimate fix\n\nRoot cause: fixed 6-minute assumption. Fix: rolling median of the last 10 consults (percentile_cont), 6-minute fallback under 3 samples. Replay of yesterday: 84% of estimates within ±5 min (was 41%). Deployed to staging."}
EOF
curl -s $AUTH -X PATCH $B/commands/$CMD -H 'content-type: application/json' --data @/tmp/demo-done.json >/dev/null
echo "done."
