# DEPLOYMENT

## Local
Node ≥ 22.13 required (`node -v`). `npm install && npm run build && npm start`. Data in `./data/smartit.db` (WAL mode). Back up by copying the file.

## Docker
`docker compose up --build`. Multi-stage image (deps → build → run) on `node:22-bookworm-slim`, runs as `node` user, `output: standalone`, `/data` volume for the DB. Image ≈ 200 MB. Health: `curl -f http://localhost:3000/`.

## CI (.github/workflows/ci.yml)
On push/PR: `npm ci` → `typecheck` → `test` → `build` → `docker build`.

## Ops notes
- Node prints `ExperimentalWarning: SQLite` once at startup — expected.
- To reset: stop the app, delete `data/smartit.db*`, start again (demo re-seeds).
- To disable the demo: `SEED_DEMO=0`.
