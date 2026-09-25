import { describe, it, expect, beforeEach } from "vitest";
import { resetDbForTests } from "@/lib/db";
import * as repo from "@/lib/repo";
import * as team from "@/lib/team";
import * as bridge from "@/lib/bridge";
import { dispatchSprint, laneStatus } from "@/lib/dispatch";

process.env.DATA_DIR = ":memory:";
beforeEach(() => resetDbForTests());

describe("team roster", () => {
  it("seeds the 15 core personas and can hire more", () => {
    expect(team.listTeam()).toHaveLength(15);
    const m = team.hire({ name: "Sameer Khan", role: "Flutter Engineer", specialty: "Flutter, offline sync", capacity: 2 });
    expect(m.id).toBe("sameer-khan");
    expect(m.layer).toBe(5);
    expect(m.reportsTo).toBe("scrum");
    expect(team.builders().map((b) => b.id)).toContain("sameer-khan");
    expect(team.totalLanes()).toBe(3 + 2); // 3 core builders (be-senior, be, fe) @1 + Sameer @2
    team.updateMember(m.id, { capacity: 9 });
    expect(team.getMember(m.id)!.capacity).toBe(5); // clamped
    team.updateMember(m.id, { active: false });
    expect(team.listTeam().some((x) => x.id === m.id)).toBe(false);
    team.removeHired(m.id);
    expect(team.getMember(m.id)).toBeNull();
    team.removeHired("fe");
    expect(team.getMember("fe")).not.toBeNull(); // core cannot be removed
  });
});

describe("dispatch", () => {
  it("fills idle lanes with To-Do stories and queues one Cowork command each", () => {
    const p = repo.createProject({ name: "D", idea: "d" });
    const sp = repo.createSprint(p.id, { goal: "g", startDate: "2026-09-17", endDate: "2026-09-24" });
    for (const t of ["API endpoint for orders", "Kanban UI screen widget", "Migration for invoices", "Settings page CSS", "Webhook handler"]) repo.createStory(p.id, { title: t, points: 3, sprintId: sp.id });
    const before = laneStatus(p.id, sp.id);
    expect(before.lanes).toBe(3);
    const r = dispatchSprint(p.id, sp.id);
    expect(r.assigned).toHaveLength(3);
    expect(r.idle).toEqual([]);
    const stories = repo.listStories(p.id);
    expect(stories.filter((s) => s.status === "in_progress")).toHaveLength(3);
    // UI story went to the frontend engineer
    expect(stories.find((s) => s.title.includes("Kanban UI"))!.assignee).toBe("Rhea");
    expect(bridge.listCommands({ projectId: p.id, status: "queued" })).toHaveLength(3);
    // nothing free now → second dispatch does nothing
    expect(dispatchSprint(p.id, sp.id).assigned).toHaveLength(0);
    // hire → one more lane → one more story dispatched
    team.hire({ name: "Priyanka Rao", role: "Backend Engineer", specialty: "Node, Postgres", capacity: 1 });
    const r2 = dispatchSprint(p.id, sp.id);
    expect(r2.assigned).toHaveLength(1);
    expect(r2.assigned[0].engineer).toBe("Priyanka Rao");
  });
});
