import { describe, it, expect, beforeEach } from "vitest";
import { resetDbForTests } from "@/lib/db";
import * as repo from "@/lib/repo";
import * as bridge from "@/lib/bridge";

process.env.DATA_DIR = ":memory:";
beforeEach(() => resetDbForTests());

describe("commands & activity", () => {
  it("queues, claims, completes and logs activity", () => {
    const p = repo.createProject({ name: "P", idea: "i" });
    const c = bridge.createCommand({ projectId: p.id, source: "app", kind: "ask", text: "hello" });
    expect(c.status).toBe("queued");
    expect(bridge.commandStats().queued).toBe(1);
    const claimed = bridge.claimNextCommand();
    expect(claimed?.id).toBe(c.id);
    expect(claimed?.status).toBe("running");
    expect(bridge.claimNextCommand()).toBeNull();
    const done = bridge.updateCommand(c.id, { status: "done", result: "answer" });
    expect(done?.status).toBe("done");
    expect(done?.result).toBe("answer");
    const types = bridge.listActivity({ projectId: p.id }).map((a) => a.type);
    expect(types).toEqual(["command.queued", "command.started", "command.done"]);
    const since = bridge.listActivity({ projectId: p.id, sinceSeq: 2 });
    expect(since).toHaveLength(1);
  });
});

describe("export / import", () => {
  it("round-trips a project bundle and upserts by name", () => {
    const p = repo.createProject({ name: "Round Trip", idea: "idea" });
    repo.addRequirement(p.id, "P0", "must");
    const sp = repo.createSprint(p.id, { goal: "g", startDate: "2026-01-01", endDate: "2026-01-14" });
    repo.createStory(p.id, { title: "s1", points: 3, sprintId: sp.id, status: "done" });
    repo.saveContract(p.id, "B", { file_list: "a.ts" });
    repo.addAdr(p.id, "T", "D");
    const b = bridge.exportProject(p.id)!;
    expect(b.stories?.[0].sprintNumber).toBe(1);
    expect(b.contracts?.B?.file_list).toBe("a.ts");

    // import into a fresh DB by name
    resetDbForTests();
    const r = bridge.importProject({ ...b, project: { ...b.project, id: undefined } });
    expect(r.created).toBe(true);
    expect(r.counts.requirements).toBe(1);
    expect(r.counts.stories).toBe(1);
    const stories = repo.listStories(r.project.id);
    expect(stories[0].sprintId).toBe(repo.listSprints(r.project.id)[0].id);
    expect(repo.getContract(r.project.id, "B").fields.file_list).toBe("a.ts");
    expect(r.project.source).toBe("claude");
    expect(r.project.lastSyncedAt).not.toBeNull();

    // second import merges without duplicating
    const r2 = bridge.importProject({ project: { name: "round trip", idea: "idea" }, requirements: [{ priority: "P0", text: "must" }, { priority: "P1", text: "new" }], phases: [{ phase: 3, status: "done", summary: "spec" }] });
    expect(r2.created).toBe(false);
    expect(r2.counts.requirements).toBe(1);
    expect(repo.listRequirements(r2.project.id)).toHaveLength(2);
    expect(repo.getPhases(r2.project.id)[3].status).toBe("active");
    expect(repo.getProject(r2.project.id)!.currentPhase).toBe(4);
  });
  it("rejects bundles without name/idea", () => {
    expect(() => bridge.importProject({ project: { name: "", idea: "" } })).toThrow();
  });
});

describe("sprint numbers", () => {
  it("imports a non-contiguous sprint number without filler sprints", () => {
    const p = repo.createProject({ name: "N", idea: "n" });
    bridge.importProject({ project: { name: "N", idea: "n" }, sprints: [{ number: 14, goal: "x", startDate: "2026-09-17", endDate: "2026-09-24", status: "active" }] });
    const sp = repo.listSprints(p.id);
    expect(sp).toHaveLength(1);
    expect(sp[0].number).toBe(14);
    expect(repo.createSprint(p.id, { goal: "next", startDate: "2026-09-25", endDate: "2026-10-01" }).number).toBe(15);
  });
});

describe("persona-attributed activity (company run)", () => {
  it("stores persona/phase/step/command and filters by command", () => {
    const p = repo.createProject({ name: "R", idea: "r" });
    const c = bridge.createCommand({ projectId: p.id, source: "app", kind: "ask", text: "what AI features?" });
    bridge.claimNextCommand();
    bridge.logActivity({ projectId: p.id, actor: "claude", type: "phase.2.analyze", message: "CTO: Claude API fits", persona: "cto", phase: 2, step: "analyze", commandId: c.id, detail: "reasoning…" });
    const run = bridge.listActivity({ commandId: c.id });
    expect(run.map((a) => a.step)).toEqual(["ask", "ask", "analyze"]);
    expect(run[2].persona).toBe("cto");
    expect(run[2].phase).toBe(2);
    expect(run[2].detail).toBe("reasoning…");
    bridge.updateCommand(c.id, { status: "done", result: "delivered" });
    const last = bridge.listActivity({ commandId: c.id }).at(-1)!;
    expect(last.step).toBe("deliver");
    expect(last.persona).toBe("founder");
    expect(last.phase).toBe(8);
  });
});
