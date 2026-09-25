import { describe, it, expect, beforeEach } from "vitest";
import { resetDbForTests } from "@/lib/db";
import * as repo from "@/lib/repo";

process.env.DATA_DIR = ":memory:";

beforeEach(() => resetDbForTests());

describe("projects & phases", () => {
  it("creates a project with 8 phases, 10 gate checks, 3 contracts, summary", () => {
    const p = repo.createProject({ name: "Test App", idea: "build a thing" });
    expect(p.slug).toBe("test_app");
    expect(p.currentPhase).toBe(1);
    const phases = repo.getPhases(p.id);
    expect(phases).toHaveLength(8);
    expect(phases[0].status).toBe("active");
    expect(phases.filter((x) => x.status === "pending")).toHaveLength(7);
    expect(repo.getGate(p.id)).toHaveLength(10);
    expect(repo.getContract(p.id, "B").fields).toEqual({});
    expect(repo.getSummary(p.id).isPass).toBe("pending");
  });
  it("marking a phase done activates the next and completes earlier ones", () => {
    const p = repo.createProject({ name: "X", idea: "y" });
    repo.setPhase(p.id, 3, "done", "spec done");
    const ph = repo.getPhases(p.id);
    expect(ph.slice(0, 3).every((x) => x.status === "done")).toBe(true);
    expect(ph[3].status).toBe("active");
    expect(ph[2].summary).toBe("spec done");
    expect(repo.getProject(p.id)!.currentPhase).toBe(4);
    repo.setPhase(p.id, 2, "active");
    const ph2 = repo.getPhases(p.id);
    expect(ph2[1].status).toBe("active");
    expect(ph2[2].status).toBe("pending");
    expect(repo.getProject(p.id)!.currentPhase).toBe(2);
    repo.setPhase(p.id, 8, "done");
    expect(repo.getPhases(p.id).every((x) => x.status === "done")).toBe(true);
    expect(repo.getProject(p.id)!.currentPhase).toBe(8);
  });
  it("deletes a project and all children", () => {
    const p = repo.createProject({ name: "Del", idea: "d" });
    repo.addRequirement(p.id, "P0", "r");
    repo.createStory(p.id, { title: "s" });
    repo.deleteProject(p.id);
    expect(repo.getProject(p.id)).toBeNull();
    expect(repo.listStories(p.id)).toEqual([]);
    expect(repo.listRequirements(p.id)).toEqual([]);
  });
});

describe("stories & sprints", () => {
  it("sets and clears doneAt when status changes", () => {
    const p = repo.createProject({ name: "S", idea: "s" });
    const s = repo.createStory(p.id, { title: "a", points: 3 });
    expect(s.doneAt).toBeNull();
    repo.updateStory(s.id, { status: "done" });
    expect(repo.getStory(s.id)!.doneAt).not.toBeNull();
    repo.updateStory(s.id, { status: "review" });
    expect(repo.getStory(s.id)!.doneAt).toBeNull();
  });
  it("only one active sprint per project; deleting a sprint unassigns stories", () => {
    const p = repo.createProject({ name: "S", idea: "s" });
    const a = repo.createSprint(p.id, { goal: "a", startDate: "2026-01-01", endDate: "2026-01-14" });
    const b = repo.createSprint(p.id, { goal: "b", startDate: "2026-01-15", endDate: "2026-01-28" });
    expect(b.number).toBe(2);
    repo.updateSprint(a.id, { status: "active" });
    repo.updateSprint(b.id, { status: "active" });
    expect(repo.listSprints(p.id).filter((x) => x.status === "active")).toHaveLength(1);
    expect(repo.getSprint(a.id)!.status).toBe("planned");
    const st = repo.createStory(p.id, { title: "x", sprintId: b.id });
    repo.deleteSprint(b.id);
    expect(repo.getStory(st.id)!.sprintId).toBeNull();
  });
  it("orders requirements by priority", () => {
    const p = repo.createProject({ name: "R", idea: "r" });
    repo.addRequirement(p.id, "P2", "c");
    repo.addRequirement(p.id, "P0", "a");
    repo.addRequirement(p.id, "P1", "b");
    expect(repo.listRequirements(p.id).map((r) => r.priority)).toEqual(["P0", "P1", "P2"]);
  });
});

describe("contracts, reviews, gate, adrs, summary", () => {
  it("round-trips contract fields as JSON", () => {
    const p = repo.createProject({ name: "C", idea: "c" });
    repo.saveContract(p.id, "B", { file_list: "a.ts\nb.ts", data_structures: "classDiagram" });
    const c = repo.getContract(p.id, "B");
    expect(c.fields.file_list).toBe("a.ts\nb.ts");
    expect(c.updatedAt).not.toBe("");
  });
  it("clamps review pass to 1..2 and stores verdicts", () => {
    const p = repo.createProject({ name: "V", idea: "v" });
    const r = repo.addReview(p.id, { file: "x.ts", verdict: "LBTM", pass: 7 });
    expect(r.pass).toBe(2);
    expect(repo.listReviews(p.id)).toHaveLength(1);
  });
  it("updates gate checks and keeps note when not provided", () => {
    const p = repo.createProject({ name: "G", idea: "g" });
    repo.setGateCheck(p.id, 4, "fail", "is-pass NO");
    repo.setGateCheck(p.id, 4, "pass");
    const g = repo.getGate(p.id).find((x) => x.check === 4)!;
    expect(g.status).toBe("pass");
    expect(g.note).toBe("is-pass NO");
  });
  it("adds ADRs and saves summary", () => {
    const p = repo.createProject({ name: "A", idea: "a" });
    repo.addAdr(p.id, "T", "D");
    expect(repo.listAdrs(p.id)).toHaveLength(1);
    repo.saveSummary(p.id, { isPass: "NO", todos: "{}", cycles: 1 });
    expect(repo.getSummary(p.id)).toMatchObject({ isPass: "NO", cycles: 1 });
  });
});
