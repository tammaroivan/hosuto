import { describe, it, expect } from "vitest";
import { computeStackStatus } from "@hosuto/shared";

describe("computeStackStatus", () => {
  it("returns running when all expected services are running", () => {
    expect(computeStackStatus(3, 3)).toEqual({ state: "running", running: 3, expected: 3 });
  });

  it("returns stopped when no services are running", () => {
    expect(computeStackStatus(0, 3)).toEqual({ state: "stopped", running: 0, expected: 3 });
  });

  it("returns partial when some services are running", () => {
    expect(computeStackStatus(2, 5)).toEqual({ state: "partial", running: 2, expected: 5 });
  });

  it("returns stopped when expected is zero", () => {
    expect(computeStackStatus(0, 0)).toEqual({ state: "stopped", running: 0, expected: 0 });
  });

  it("returns running when running exceeds expected", () => {
    expect(computeStackStatus(4, 3)).toEqual({ state: "running", running: 4, expected: 3 });
  });
});
