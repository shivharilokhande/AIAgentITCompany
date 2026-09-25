import { describe, it, expect } from "vitest";
import { velocity, burndown, gateScore, lgtmRatio, consistencyGate, phaseProgress, splitList, pointsByStatus } from "@/lib/metrics";
import type { Sprint, UserStory, Contract, GateCheck, FileReview, PhaseState } from "@/lib/types";

const sprint = (n: number, start: string, end: string, id = `s${n}`): Sprint => ({ id, projectId: "p", number: n, goal: "", startDate: start, endDate: end, status: "active" });
const story = (id: string, sprintId: string | null, points: number, status: UserStory["status"], doneAt: string | null = null): UserStory =>
  ({ id, projectId: "p", sprintId, title: id, description: "", points, status, assignee: "", order: 0, doneAt, createdAt: "2026-01-01T00:00:00Z" });

describe("phaseProgress", () => {
  it("counts done phases", () => {
    const ph: PhaseState[] = [1, 2, 3, 4].map((n) => ({ projectId: "p", phase: n, status: n <= 2 ? "done" : "pending", summary: "", completedAt: null }));
    expect(phaseProgress(ph)).toBe(50);
    expect(phaseProgress([])).toBe(0);
  });
});

describe("velocity", () => {
  it("sums planned and delivered per sprint in number order", () => {
    const sps = [sprint(2, "2026-01-15", "2026-01-28"), sprint(1, "2026-01-01", "2026-01-14")];
    const sts = [story("a", "s1", 5, "done"), story("b", "s1", 3, "todo"), story("c", "s2", 8, "done"), story("d", null, 2, "done")];
    expect(velocity(sps, sts)).toEqual([{ sprint: 1, planned: 8, delivered: 5 }, { sprint: 2, planned: 8, delivered: 8 }]);
  });
});

describe("burndown", () => {
  it("produces one point per day with ideal line and remaining up to today", () => {
    const sp = sprint(1, "2026-03-01", "2026-03-05");
    const sts = [story("a", "s1", 4, "done", "2026-03-02T10:00:00Z"), story("b", "s1", 6, "todo")];
    const pts = burndown(sp, sts, new Date("2026-03-03T12:00:00Z"));
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ day: "2026-03-01", remaining: 10, ideal: 10 });
    expect(pts[1].remaining).toBe(6); // done on day 2 counts by end of that day
    expect(pts[2].remaining).toBe(6);
    expect(pts[4].ideal).toBe(0);
    expect(Number.isNaN(pts[3].remaining)).toBe(true); // future day
  });
  it("returns [] on invalid dates", () => {
    expect(burndown(sprint(1, "bad", "2026-01-01"), [])).toEqual([]);
    expect(burndown(sprint(1, "2026-01-05", "2026-01-01"), [])).toEqual([]);
  });
});

describe("gateScore / lgtmRatio", () => {
  it("scores passes", () => {
    const checks: GateCheck[] = [1, 2, 3, 4].map((n) => ({ projectId: "p", check: n, status: n <= 3 ? "pass" : "fail", note: "" }));
    expect(gateScore(checks)).toBe(75);
    expect(gateScore([])).toBe(0);
  });
  it("uses the latest verdict per file", () => {
    const r = (file: string, verdict: FileReview["verdict"], t: string): FileReview => ({ id: file + t, projectId: "p", file, verdict, pass: 1, notes: "", createdAt: t });
    const m = lgtmRatio([r("a.ts", "LBTM", "2026-01-01T00:00:00Z"), r("a.ts", "LGTM", "2026-01-02T00:00:00Z"), r("b.ts", "LBTM", "2026-01-01T00:00:00Z")]);
    expect(m.files).toBe(2);
    expect(m.lgtm).toBe(1);
    expect(m.ratio).toBe(50);
    expect(m.total).toBe(3);
  });
});

describe("consistencyGate", () => {
  const c = (kind: Contract["kind"], fields: Record<string, string>): Contract => ({ projectId: "p", kind, fields, updatedAt: "" });
  it("passes when File List == Logic Analysis == Task List", () => {
    const B = c("B", { file_list: "a.ts\nb.ts" });
    const C = c("C", { logic_analysis: "a.ts — thing\nb.ts — other", task_list: "b.ts\na.ts" });
    const g = consistencyGate(B, C);
    expect(g.ok).toBe(true);
    expect(g.issues).toEqual([]);
  });
  it("reports missing and extra files and duplicates", () => {
    const B = c("B", { file_list: "a.ts\nb.ts" });
    const C = c("C", { logic_analysis: "a.ts — thing\nc.ts — extra", task_list: "1. a.ts\n2. a.ts" });
    const g = consistencyGate(B, C);
    expect(g.ok).toBe(false);
    expect(g.issues.some((i) => i.includes('"b.ts" is in File List but has no Logic Analysis'))).toBe(true);
    expect(g.issues.some((i) => i.includes('"b.ts" is in File List but not in Task List'))).toBe(true);
    expect(g.issues.some((i) => i.includes('"c.ts"'))).toBe(true);
    expect(g.issues.some((i) => i.includes("duplicate"))).toBe(true);
  });
  it("flags empty contracts", () => {
    const g = consistencyGate(c("B", {}), c("C", {}));
    expect(g.ok).toBe(false);
    expect(g.issues.length).toBe(3);
  });
});

describe("helpers", () => {
  it("splitList trims and drops blanks", () => expect(splitList(" a \n\n b\r\n")).toEqual(["a", "b"]));
  it("pointsByStatus sums", () => expect(pointsByStatus([story("a", null, 2, "done"), story("b", null, 3, "done"), story("c", null, 1, "todo")])).toEqual({ done: 5, todo: 1 }));
});
