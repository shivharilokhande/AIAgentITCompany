# VISION — AIAgentITCompany

**Original idea (verbatim):** "I want visual of how this work and a complete project, product and scrum management tool and i can use it in each project — build a webapp for this."

**One-liner:** A self-hosted web console that turns the Smart IT by Shiv operating model (8 phases · 15 personas · SOP contracts · message pool) into a living management tool for every project you run.

## Must-haves (v1)
1. Projects: create from a one-line idea; each project carries its own 8-phase pipeline state.
2. Pipeline visualizer: phases, owning personas, SOP wiring and message pool — with live per-project status.
3. Product backlog: requirement pool (P0/P1/P2), user stories, and Contracts A/B/C as structured forms with an automated consistency gate.
4. Scrum: sprints, kanban board (drag & drop), story points, velocity and burndown.
5. Quality & delivery: per-file LGTM/LBTM review log, code-summary is-pass, 10-check quality gate, ADRs, deployment status.

## Deferred to v2
- Multi-user / auth / roles (user chose single-user).
- Import/export of a real repo's files to auto-populate File List.
- AI-driven execution of phases from inside the app (the skill does that; the console tracks it).

## Success criteria
`docker compose up` → open http://localhost:3000 → create a project → walk it through all 8 phases with real sprint data, no external services.
