import { describe, expect, it } from "vitest";
import {
  resolveTrainingPortraitOnline,
  resolveTrainingPresenceLabel,
} from "@/lib/training/trainingPresence";

describe("trainingPresence", () => {
  it("maps actor_active to Online / Offline", () => {
    expect(resolveTrainingPresenceLabel(true, "running")).toBe("Online");
    expect(resolveTrainingPresenceLabel(false, "idle")).toBe("Offline");
  });

  it("shows transitional labels before actor spins up or down", () => {
    expect(resolveTrainingPresenceLabel(false, "starting")).toBe("Starting…");
    expect(resolveTrainingPresenceLabel(false, "stopping")).toBe("Stopping…");
  });

  it("dims portrait when actor is not active", () => {
    expect(resolveTrainingPortraitOnline(true)).toBe(true);
    expect(resolveTrainingPortraitOnline(false)).toBe(false);
  });
});
