import { ProgressiveSession } from "../progressive";
import type { ProgressiveConfig } from "../progressive";

/**
 * Helper to create a standard progressive config for testing.
 * 3 stages at minutes 0, 10, 30 with total 60 minutes.
 */
function createTestConfig(): ProgressiveConfig {
  return {
    totalDurationMinutes: 60,
    stages: [
      {
        startMinute: 0,
        lockLevel: 1,
        blockingLevel: "light",
        description: "Light blocking",
      },
      {
        startMinute: 10,
        lockLevel: 2,
        blockingLevel: "moderate",
        description: "Moderate blocking",
      },
      {
        startMinute: 30,
        lockLevel: 3,
        blockingLevel: "full",
        description: "Full blocking",
      },
    ],
  };
}

describe("ProgressiveSession", () => {
  describe("constructor", () => {
    it("should create a session with the given config", () => {
      const config = createTestConfig();
      const session = new ProgressiveSession(config);

      expect(session.getStages()).toHaveLength(3);
    });

    it("should start at stage index 0", () => {
      const config = createTestConfig();
      const session = new ProgressiveSession(config);

      const currentStage = session.getCurrentStage();
      expect(currentStage.startMinute).toBe(0);
      expect(currentStage.lockLevel).toBe(1);
      expect(currentStage.blockingLevel).toBe("light");
    });
  });

  describe("getCurrentStage", () => {
    it("should return the first stage initially", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.getCurrentStage();

      expect(stage.startMinute).toBe(0);
      expect(stage.lockLevel).toBe(1);
      expect(stage.blockingLevel).toBe("light");
      expect(stage.description).toBe("Light blocking");
    });

    it("should return the correct stage after an update", () => {
      const session = new ProgressiveSession(createTestConfig());

      session.update(15); // Past stage 2 start (10 min)

      const stage = session.getCurrentStage();
      expect(stage.lockLevel).toBe(2);
      expect(stage.blockingLevel).toBe("moderate");
    });
  });

  describe("update", () => {
    it("should return stage 1 for elapsed time within stage 1 range", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(5); // 5 min < 10 min (stage 2 start)

      expect(stage.lockLevel).toBe(1);
      expect(stage.blockingLevel).toBe("light");
    });

    it("should return stage 2 for elapsed time within stage 2 range", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(20); // 10 <= 20 < 30

      expect(stage.lockLevel).toBe(2);
      expect(stage.blockingLevel).toBe("moderate");
    });

    it("should return stage 3 for elapsed time within stage 3 range", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(45); // 45 >= 30

      expect(stage.lockLevel).toBe(3);
      expect(stage.blockingLevel).toBe("full");
    });

    it("should return stage 2 exactly at the boundary", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(10); // Exactly at stage 2 start

      expect(stage.lockLevel).toBe(2);
    });

    it("should return stage 3 exactly at stage 3 boundary", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(30); // Exactly at stage 3 start

      expect(stage.lockLevel).toBe(3);
    });

    it("should stay at stage 3 for times beyond total duration", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(90); // Beyond 60 min

      expect(stage.lockLevel).toBe(3);
      expect(stage.blockingLevel).toBe("full");
    });
  });

  describe("onStageChanged callback", () => {
    it("should fire when stage transitions from 1 to 2", () => {
      const session = new ProgressiveSession(createTestConfig());
      const callback = vi.fn();
      session.onStageChanged(callback);

      session.update(15); // Transition from stage 0 to stage 1

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          lockLevel: 2,
          blockingLevel: "moderate",
        }),
      );
    });

    it("should fire when stage transitions from 2 to 3", () => {
      const session = new ProgressiveSession(createTestConfig());
      const callback = vi.fn();
      session.onStageChanged(callback);

      session.update(15); // Stage 1 -> 2
      session.update(35); // Stage 2 -> 3

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({
          lockLevel: 3,
          blockingLevel: "full",
        }),
      );
    });

    it("should NOT fire when stage stays the same", () => {
      const session = new ProgressiveSession(createTestConfig());
      const callback = vi.fn();
      session.onStageChanged(callback);

      session.update(2); // Still stage 1
      session.update(5); // Still stage 1
      session.update(8); // Still stage 1

      expect(callback).not.toHaveBeenCalled();
    });

    it("should NOT fire when no callback is registered", () => {
      const session = new ProgressiveSession(createTestConfig());

      // Should not throw
      expect(() => session.update(15)).not.toThrow();
    });

    it("should fire only once per transition even with multiple updates in same stage", () => {
      const session = new ProgressiveSession(createTestConfig());
      const callback = vi.fn();
      session.onStageChanged(callback);

      session.update(15); // Stage 1 -> 2
      session.update(20); // Still stage 2
      session.update(25); // Still stage 2

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should skip directly to stage 3 if elapsed jumps past stage 2", () => {
      const session = new ProgressiveSession(createTestConfig());
      const callback = vi.fn();
      session.onStageChanged(callback);

      // Jump directly from stage 1 to stage 3
      session.update(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          lockLevel: 3,
          blockingLevel: "full",
        }),
      );
    });
  });

  describe("getRemainingStages", () => {
    it("should return all stages except the first initially", () => {
      const session = new ProgressiveSession(createTestConfig());

      const remaining = session.getRemainingStages();

      expect(remaining).toHaveLength(2);
      expect(remaining[0]!.startMinute).toBe(10);
      expect(remaining[1]!.startMinute).toBe(30);
    });

    it("should return only stage 3 when past stage 2 start", () => {
      const session = new ProgressiveSession(createTestConfig());
      session.update(15);

      const remaining = session.getRemainingStages();

      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.startMinute).toBe(30);
    });

    it("should return empty array when past all stages", () => {
      const session = new ProgressiveSession(createTestConfig());
      session.update(45);

      const remaining = session.getRemainingStages();

      expect(remaining).toHaveLength(0);
    });

    it("should return stages with startMinute strictly greater than elapsed", () => {
      const session = new ProgressiveSession(createTestConfig());
      session.update(10); // Exactly at stage 2 start

      const remaining = session.getRemainingStages();

      // startMinute 10 is NOT > 10, so only stage 3 remains
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.startMinute).toBe(30);
    });
  });

  describe("getStages", () => {
    it("should return all stages", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stages = session.getStages();

      expect(stages).toHaveLength(3);
    });

    it("should return a copy (not a reference)", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stages1 = session.getStages();
      const stages2 = session.getStages();

      expect(stages1).not.toBe(stages2);
      expect(stages1).toEqual(stages2);
    });

    it("should not be affected by updates", () => {
      const session = new ProgressiveSession(createTestConfig());
      session.update(45);

      const stages = session.getStages();

      expect(stages).toHaveLength(3); // All 3 stages are still returned
    });
  });

  describe("createDefault", () => {
    it("should create a valid 3-stage config", () => {
      const config = ProgressiveSession.createDefault(90);

      expect(config.stages).toHaveLength(3);
      expect(config.totalDurationMinutes).toBe(90);
    });

    it("should have stages with correct blocking levels", () => {
      const config = ProgressiveSession.createDefault(90);

      expect(config.stages[0]!.blockingLevel).toBe("light");
      expect(config.stages[1]!.blockingLevel).toBe("moderate");
      expect(config.stages[2]!.blockingLevel).toBe("full");
    });

    it("should have stages with escalating lock levels", () => {
      const config = ProgressiveSession.createDefault(90);

      expect(config.stages[0]!.lockLevel).toBe(1);
      expect(config.stages[1]!.lockLevel).toBe(2);
      expect(config.stages[2]!.lockLevel).toBe(3);
    });

    it("should have the first stage start at minute 0", () => {
      const config = ProgressiveSession.createDefault(90);

      expect(config.stages[0]!.startMinute).toBe(0);
    });

    it("should create a 90-minute config with correct boundaries", () => {
      const config = ProgressiveSession.createDefault(90);

      // For 90 min: stage1End = round(90 * 15/90) = 15
      //             stage2End = round(90 * 45/90) = 45
      expect(config.stages[0]!.startMinute).toBe(0);
      expect(config.stages[1]!.startMinute).toBe(15);
      expect(config.stages[2]!.startMinute).toBe(45);
    });

    it("should scale proportionally for 60-minute duration", () => {
      const config = ProgressiveSession.createDefault(60);

      // For 60 min: stage1End = round(60 * 15/90) = round(10) = 10
      //             stage2End = round(60 * 45/90) = round(30) = 30
      expect(config.stages[0]!.startMinute).toBe(0);
      expect(config.stages[1]!.startMinute).toBe(10);
      expect(config.stages[2]!.startMinute).toBe(30);
    });

    it("should scale proportionally for 30-minute duration", () => {
      const config = ProgressiveSession.createDefault(30);

      // For 30 min: stage1End = round(30 * 15/90) = round(5) = 5
      //             stage2End = round(30 * 45/90) = round(15) = 15
      expect(config.stages[0]!.startMinute).toBe(0);
      expect(config.stages[1]!.startMinute).toBe(5);
      expect(config.stages[2]!.startMinute).toBe(15);
    });

    it("should scale proportionally for 120-minute duration", () => {
      const config = ProgressiveSession.createDefault(120);

      // For 120 min: stage1End = round(120 * 15/90) = round(20) = 20
      //              stage2End = round(120 * 45/90) = round(60) = 60
      expect(config.stages[0]!.startMinute).toBe(0);
      expect(config.stages[1]!.startMinute).toBe(20);
      expect(config.stages[2]!.startMinute).toBe(60);
    });

    it("should have human-readable descriptions", () => {
      const config = ProgressiveSession.createDefault(90);

      expect(config.stages[0]!.description).toContain("Light");
      expect(config.stages[1]!.description).toContain("Moderate");
      expect(config.stages[2]!.description).toContain("Full");
    });

    it("should create a usable ProgressiveSession from the default config", () => {
      const config = ProgressiveSession.createDefault(90);
      const session = new ProgressiveSession(config);

      expect(session.getCurrentStage().lockLevel).toBe(1);
      session.update(20); // Past stage 2 start (15)
      expect(session.getCurrentStage().lockLevel).toBe(2);
      session.update(50); // Past stage 3 start (45)
      expect(session.getCurrentStage().lockLevel).toBe(3);
    });
  });

  describe("reset", () => {
    it("should return to initial stage", () => {
      const session = new ProgressiveSession(createTestConfig());
      session.update(45); // Stage 3

      session.reset();

      const stage = session.getCurrentStage();
      expect(stage.lockLevel).toBe(1);
      expect(stage.blockingLevel).toBe("light");
    });

    it("should reset elapsed time so getRemainingStages returns all non-zero stages", () => {
      const session = new ProgressiveSession(createTestConfig());
      session.update(45); // Past all stages

      session.reset();

      const remaining = session.getRemainingStages();
      expect(remaining).toHaveLength(2); // stages at 10 and 30
    });

    it("should fire onStageChanged again after reset and update", () => {
      const session = new ProgressiveSession(createTestConfig());
      const callback = vi.fn();
      session.onStageChanged(callback);

      session.update(15); // Stage 1 -> 2, callback fires
      expect(callback).toHaveBeenCalledTimes(1);

      session.reset();
      session.update(15); // Stage 1 -> 2 again, callback should fire again

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle a config with a single stage", () => {
      const config: ProgressiveConfig = {
        totalDurationMinutes: 30,
        stages: [
          {
            startMinute: 0,
            lockLevel: 3,
            blockingLevel: "full",
            description: "Full from start",
          },
        ],
      };
      const session = new ProgressiveSession(config);

      const stage = session.update(15);

      expect(stage.lockLevel).toBe(3);
      expect(session.getRemainingStages()).toHaveLength(0);
    });

    it("should handle update at minute 0", () => {
      const session = new ProgressiveSession(createTestConfig());

      const stage = session.update(0);

      expect(stage.lockLevel).toBe(1);
    });
  });
});
