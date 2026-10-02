import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetDbForTests } from "@/lib/db";
import * as repo from "@/lib/repo";
import { listSessions, matchProject } from "@/lib/cowork";

process.env.DATA_DIR = ":memory:";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowork-sessions-"));
process.env.COWORK_SESSIONS_DIR = root;
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
beforeEach(() => resetDbForTests());

function mkSession(dirName: string, meta: Record<string, unknown>) {
  const space = path.join(root, "space-a", "space-b");
  fs.mkdirSync(path.join(space, dirName), { recursive: true });
  fs.writeFileSync(path.join(space, dirName, "audit.jsonl"), "");
  fs.writeFileSync(path.join(space, `${meta.sessionId}.json`), JSON.stringify({ lastActivityAt: Date.now(), ...meta }));
}

describe("Cowork session discovery", () => {
  it("finds sessions whose folder is the first 8 chars of the id, the bare uuid, or the full id", () => {
    mkSession("d6941130", { sessionId: "local_d6941130-11f6-4678-9fde-c6793094ab19", title: "App development docs and UI tracker", userSelectedFolders: ["/Users/x/AI Development/GharHisab"], folderMountNames: { "/Users/x/AI Development/GharHisab": "GharHisab" } });
    mkSession("local_57dbf36b-ae35-49f4-8aba-a4cbfbde33a0", { sessionId: "local_57dbf36b-ae35-49f4-8aba-a4cbfbde33a0", title: "YouTube automation agent", initialMessage: "find ~ -iname '*namaste*'" });
    mkSession("aaaaaaaa-0000-0000-0000-000000000000", { sessionId: "local_aaaaaaaa-0000-0000-0000-000000000000", title: "NamastPOS 2" });
    const s = listSessions();
    expect(s.map((x) => x.title).sort()).toEqual(["App development docs and UI tracker", "NamastPOS 2", "YouTube automation agent"]);
  });
});

describe("Cowork session → project matching", () => {
  it("prefers the attached repo folder over any text, tolerates a typo in the title, and ignores a stray mention in the first message", () => {
    const ghar = repo.createProject({ name: "GharHisab", idea: "x", repoPath: "/Users/x/AI Development/GharHisab" });
    const pos = repo.createProject({ name: "NamastePOS", idea: "y" });
    const projects = repo.listProjects();
    const base = { id: "s", cwd: "", initialMessage: "", lastActivityAt: 0, dir: "", auditFile: "" };
    expect(matchProject({ ...base, title: "App development docs and UI tracker", folders: ["/Users/x/AI Development/GharHisab"] }, projects)?.id).toBe(ghar.id);
    expect(matchProject({ ...base, title: "NamastPOS 2", folders: [] }, projects)?.id).toBe(pos.id);
    // a folder attached beats a different project named in the title
    expect(matchProject({ ...base, title: "NamastePOS billing", folders: ["/Users/x/AI Development/GharHisab/apps/mobile"] }, projects)?.id).toBe(ghar.id);
    // text-only fallback still works when nothing stronger exists
    expect(matchProject({ ...base, title: "YouTube automation agent", folders: [], initialMessage: "look for namastepos repos" }, projects)?.id).toBe(pos.id);
    expect(matchProject({ ...base, title: "Obsidian vault sweep", folders: [] }, projects)).toBeNull();
  });
});
