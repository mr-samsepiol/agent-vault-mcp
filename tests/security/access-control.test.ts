import { describe, it, expect } from "vitest";
import { AccessControl } from "../../../src/security/access-control.js";

describe("AccessControl", () => {
  it("should allow owner to access their own plan", async () => {
    const ac = new AccessControl();
    expect(await ac.canAccessPlan({ userId: "user-1" }, "user-1")).toBe(true);
  });

  it("should deny access to another user's plan", async () => {
    const ac = new AccessControl();
    expect(await ac.canAccessPlan({ userId: "user-2" }, "user-1")).toBe(false);
  });

  it("should allow owner to modify their own plan", async () => {
    const ac = new AccessControl();
    expect(await ac.canModifyPlan({ userId: "user-1", agentId: "agent-1" }, "user-1", "agent-1")).toBe(true);
  });

  it("should deny modification of another user's plan", async () => {
    const ac = new AccessControl();
    expect(await ac.canModifyPlan({ userId: "user-2" }, "user-1", "agent-1")).toBe(false);
  });

  it("should deny modification from wrong agent", async () => {
    const ac = new AccessControl();
    expect(await ac.canModifyPlan({ userId: "user-1", agentId: "agent-2" }, "user-1", "agent-1")).toBe(false);
  });

  it("should allow modification without agent context", async () => {
    const ac = new AccessControl();
    expect(await ac.canModifyPlan({ userId: "user-1" }, "user-1", "agent-1")).toBe(true);
  });
});
