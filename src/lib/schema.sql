CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  idea TEXT NOT NULL,
  current_phase INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'greenfield',
  deploy_status TEXT NOT NULL DEFAULT 'not_deployed',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS phase_state (
  project_id TEXT NOT NULL,
  phase INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT NOT NULL DEFAULT '',
  completed_at TEXT,
  PRIMARY KEY (project_id, phase)
);
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  priority TEXT NOT NULL,
  text TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  goal TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sprint_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee TEXT NOT NULL DEFAULT '',
  ord INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contracts (
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, kind)
);
CREATE TABLE IF NOT EXISTS file_reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file TEXT NOT NULL,
  verdict TEXT NOT NULL,
  pass INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gate_checks (
  project_id TEXT NOT NULL,
  chk INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (project_id, chk)
);
CREATE TABLE IF NOT EXISTS adrs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS code_summary (
  project_id TEXT PRIMARY KEY,
  is_pass TEXT NOT NULL DEFAULT 'pending',
  todos TEXT NOT NULL DEFAULT '',
  cycles INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stories_project ON stories(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_reqs_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON file_reviews(project_id);
-- v2: Claude Bridge
CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  kind TEXT NOT NULL DEFAULT 'ask',
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  result TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL,
  project_id TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  type TEXT NOT NULL DEFAULT 'note',
  message TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_activity_seq ON activity(seq);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity(project_id);
