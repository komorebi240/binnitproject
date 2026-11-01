import { describe, expect, it } from "@jest/globals";
import type { AuthorityLevel } from "@/features/auth/types";
import { tourStepsFor } from "./tourSteps";

const LEVELS: AuthorityLevel[] = ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD", "EMPLOYEE"];

describe("tourStepsFor", () => {
  it.each(LEVELS)("%s gets a tour that opens with a welcome and ends with done, without repeated steps", (level) => {
    const steps = tourStepsFor(level);
    expect(steps[0]?.id).toBe("welcome");
    expect(steps[steps.length - 1]?.id).toBe("done");
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("everyone is shown the features added after the first tour", () => {
    for (const level of LEVELS) {
      const ids = tourStepsFor(level).map((step) => step.id);
      expect(ids).toEqual(expect.arrayContaining(["notes", "timer", "notifications", "split-screen", "company-page", "projects", "crm", "whiteboards", "smart-select", "meetings", "attendance", "leave", "finance"]));
    }
  });

  it("every step that points at something names a data-tour target", () => {
    for (const level of LEVELS) {
      for (const step of tourStepsFor(level)) {
        if (step.target !== undefined) expect(step.target.length).toBeGreaterThan(0);
      }
    }
  });
});
