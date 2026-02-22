import { calculateFocusScore } from "../index";
import type { ScoreInput } from "../index";

describe("calculateFocusScore", () => {
  describe("perfect session", () => {
    it("should return 100 for a perfect session (full time, 0 distractions, completed)", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      expect(score).toBe(100);
    });
  });

  describe("time ratio component", () => {
    it("should give a high score when actual equals planned with zero distractions", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 50,
        actualFocusMinutes: 50,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      expect(score).toBe(100);
    });

    it("should cap time ratio at 100 when actual exceeds planned", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 50,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // Extra time should not produce score above 100
      expect(score).toBe(100);
    });

    it("should reduce score when actual is less than planned", () => {
      const fullInput: ScoreInput = {
        plannedFocusMinutes: 100,
        actualFocusMinutes: 100,
        distractionAttempts: 0,
        sessionCompleted: true,
      };
      const halfInput: ScoreInput = {
        plannedFocusMinutes: 100,
        actualFocusMinutes: 50,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const fullScore = calculateFocusScore(fullInput);
      const halfScore = calculateFocusScore(halfInput);

      expect(halfScore).toBeLessThan(fullScore);
    });

    it("should give 0 time component when actual is 0", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 0,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // 0 time ratio (0*0.6) + 100 distraction (100*0.25=25) + 100 completion (100*0.15=15) = 40
      expect(score).toBe(40);
    });
  });

  describe("distraction component", () => {
    it("should give maximum distraction score with 0 distractions", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      expect(score).toBe(100);
    });

    it("should reduce score with more distractions", () => {
      const noDistraction: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: true,
      };
      const someDistraction: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 5,
        sessionCompleted: true,
      };
      const manyDistraction: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 20,
        sessionCompleted: true,
      };

      const score0 = calculateFocusScore(noDistraction);
      const score5 = calculateFocusScore(someDistraction);
      const score20 = calculateFocusScore(manyDistraction);

      expect(score5).toBeLessThan(score0);
      expect(score20).toBeLessThan(score5);
    });

    it("should significantly lower score with 10 distractions", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 10,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // With 10 distractions, distraction score ~= 100 * exp(-1) ~= 36.8
      // Total: 60 (time) + 36.8*0.25 (distraction) + 15 (completion) ~= 84
      expect(score).toBeLessThan(90);
      expect(score).toBeGreaterThan(70);
    });

    it("should give very low distraction component with 20+ distractions", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 30,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // Distraction score with 30 attempts = 100 * exp(-3) ~= 5
      // Total: 60 + 5*0.25 + 15 ~= 76
      expect(score).toBeLessThan(80);
    });
  });

  describe("completion component", () => {
    it("should give completion bonus when session is completed", () => {
      const completed: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: true,
      };
      const notCompleted: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: false,
      };

      const completedScore = calculateFocusScore(completed);
      const notCompletedScore = calculateFocusScore(notCompleted);

      expect(completedScore).toBeGreaterThan(notCompletedScore);
    });

    it("should lose 15 points when session is not completed (all else perfect)", () => {
      const completed: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: true,
      };
      const notCompleted: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 0,
        sessionCompleted: false,
      };

      const diff = calculateFocusScore(completed) - calculateFocusScore(notCompleted);

      expect(diff).toBe(15);
    });
  });

  describe("score clamping", () => {
    it("should never return a score above 100", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 10,
        actualFocusMinutes: 1000,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      expect(score).toBeLessThanOrEqual(100);
    });

    it("should never return a score below 0", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 100,
        actualFocusMinutes: 0,
        distractionAttempts: 1000,
        sessionCompleted: false,
      };

      const score = calculateFocusScore(input);

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edge cases", () => {
    it("should return 0 when planned minutes is 0", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 0,
        actualFocusMinutes: 0,
        distractionAttempts: 0,
        sessionCompleted: false,
      };

      const score = calculateFocusScore(input);

      // 0 time (planned=0) + 100 distraction (100*0.25=25) + 0 completion = 25
      expect(score).toBe(25);
    });

    it("should handle negative actual minutes gracefully", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: -5,
        distractionAttempts: 0,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // Negative actual / positive planned = negative ratio, clamped to 0
      // 0 time + 25 distraction + 15 completion = 40
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle negative distraction count gracefully", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: -5,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // Negative distractions treated as 0 (exp(-0.1 * -5) > 1, but clamped)
      expect(score).toBe(100);
    });

    it("should handle very large distraction counts", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 25,
        actualFocusMinutes: 25,
        distractionAttempts: 10000,
        sessionCompleted: true,
      };

      const score = calculateFocusScore(input);

      // Distraction score approaches 0 with huge count
      // Total: 60 + ~0 + 15 = 75
      expect(score).toBe(75);
    });

    it("should return consistent results for the same input", () => {
      const input: ScoreInput = {
        plannedFocusMinutes: 30,
        actualFocusMinutes: 20,
        distractionAttempts: 3,
        sessionCompleted: true,
      };

      const score1 = calculateFocusScore(input);
      const score2 = calculateFocusScore(input);

      expect(score1).toBe(score2);
    });
  });
});
