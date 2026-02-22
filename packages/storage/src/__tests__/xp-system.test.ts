import {
  calculateSessionXP,
  getLevelInfo,
  getXPThreshold,
} from "../gamification/xp-system";

// ──────────────────── calculateSessionXP ────────────────────

describe("calculateSessionXP", () => {
  describe("basic formula validation", () => {
    it("returns 0 when duration is 0 regardless of lock level", () => {
      expect(calculateSessionXP(0, 1, true)).toBe(0);
      expect(calculateSessionXP(0, 3, true)).toBe(0);
      expect(calculateSessionXP(0, 5, false)).toBe(0);
    });

    it("applies base rate of 2 XP per minute", () => {
      // level 1, completed: base * 1.0 * 1.5 = 25 * 2 * 1.0 * 1.5 = 75
      const xp = calculateSessionXP(25, 1, true);
      expect(xp).toBe(75);
    });
  });

  describe("lock level multiplier", () => {
    // lockMult = 1.0 + (level - 1) * 0.25
    // level 1 → 1.00, level 2 → 1.25, level 3 → 1.50, level 4 → 1.75, level 5 → 2.00

    it("applies multiplier 1.00 at lock level 1", () => {
      // 25 * 2 * 1.00 * 1.5 = 75
      expect(calculateSessionXP(25, 1, true)).toBe(75);
    });

    it("applies multiplier 1.25 at lock level 2", () => {
      // 25 * 2 * 1.25 * 1.5 = 93.75 → round = 94
      expect(calculateSessionXP(25, 2, true)).toBe(94);
    });

    it("applies multiplier 1.50 at lock level 3", () => {
      // 25 * 2 * 1.50 * 1.5 = 112.5 → round = 113
      expect(calculateSessionXP(25, 3, true)).toBe(113);
    });

    it("applies multiplier 1.75 at lock level 4", () => {
      // 25 * 2 * 1.75 * 1.5 = 131.25 → round = 131
      expect(calculateSessionXP(25, 4, true)).toBe(131);
    });

    it("applies multiplier 2.00 at lock level 5", () => {
      // 25 * 2 * 2.00 * 1.5 = 150
      expect(calculateSessionXP(25, 5, true)).toBe(150);
    });
  });

  describe("completion bonus", () => {
    it("applies 1.5x multiplier for completed sessions", () => {
      // 60 * 2 * 1.0 * 1.5 = 180
      expect(calculateSessionXP(60, 1, true)).toBe(180);
    });

    it("applies 0.75x multiplier for aborted sessions", () => {
      // 60 * 2 * 1.0 * 0.75 = 90
      expect(calculateSessionXP(60, 1, false)).toBe(90);
    });

    it("completed gives exactly double XP versus aborted (ratio 1.5/0.75 = 2)", () => {
      const completed = calculateSessionXP(100, 1, true);
      const aborted = calculateSessionXP(100, 1, false);
      expect(completed).toBe(aborted * 2);
    });
  });

  describe("various duration values", () => {
    it("calculates correctly for 25-minute Pomodoro", () => {
      // 25 * 2 * 1.50 * 1.5 = 112.5 → 113
      expect(calculateSessionXP(25, 3, true)).toBe(113);
    });

    it("calculates correctly for 90-minute Deep Work", () => {
      // 90 * 2 * 1.75 * 1.5 = 472.5 → 473
      expect(calculateSessionXP(90, 4, true)).toBe(473);
    });

    it("calculates correctly for 180-minute Marathon", () => {
      // 180 * 2 * 2.00 * 1.5 = 1080
      expect(calculateSessionXP(180, 5, true)).toBe(1080);
    });

    it("calculates correctly for 180-minute Marathon aborted", () => {
      // 180 * 2 * 2.00 * 0.75 = 540
      expect(calculateSessionXP(180, 5, false)).toBe(540);
    });

    it("handles fractional duration minutes", () => {
      // 10.5 * 2 * 1.0 * 1.5 = 31.5 → round = 32
      expect(calculateSessionXP(10.5, 1, true)).toBe(32);
    });

    it("handles very large durations", () => {
      // 1000 * 2 * 1.0 * 1.5 = 3000
      expect(calculateSessionXP(1000, 1, true)).toBe(3000);
    });
  });

  describe("rounding", () => {
    it("rounds to nearest integer", () => {
      // 7 * 2 * 1.25 * 1.5 = 26.25 → round = 26
      expect(calculateSessionXP(7, 2, true)).toBe(26);
    });

    it("rounds 0.5 up (Math.round behavior)", () => {
      // 1 * 2 * 1.25 * 1.5 = 3.75 → round = 4
      expect(calculateSessionXP(1, 2, true)).toBe(4);
    });
  });
});

// ──────────────────── getLevelInfo ────────────────────

describe("getLevelInfo", () => {
  describe("level determination", () => {
    it("returns level 0 for 0 XP", () => {
      const info = getLevelInfo(0);
      expect(info.level).toBe(0);
      expect(info.title).toBe("Novice");
    });

    it("returns level 0 for 99 XP (just below level 1)", () => {
      const info = getLevelInfo(99);
      expect(info.level).toBe(0);
    });

    it("returns level 1 at exactly 100 XP", () => {
      const info = getLevelInfo(100);
      expect(info.level).toBe(1);
      expect(info.title).toBe("Apprentice");
    });

    it("returns level 1 for 299 XP (just below level 2)", () => {
      const info = getLevelInfo(299);
      expect(info.level).toBe(1);
    });

    it("returns level 2 at exactly 300 XP", () => {
      const info = getLevelInfo(300);
      expect(info.level).toBe(2);
      expect(info.title).toBe("Focused");
    });

    it("returns level 9 (Grandmaster) at 5500 XP", () => {
      const info = getLevelInfo(5500);
      expect(info.level).toBe(9);
      expect(info.title).toBe("Grandmaster");
    });

    it("returns max level 19 at exactly 65000 XP", () => {
      const info = getLevelInfo(65000);
      expect(info.level).toBe(19);
      expect(info.title).toBe("Ultimate");
    });

    it("returns max level 19 when XP exceeds 65000", () => {
      const info = getLevelInfo(999999);
      expect(info.level).toBe(19);
      expect(info.title).toBe("Ultimate");
    });

    it("returns correct level for mid-range XP (1200)", () => {
      // 1200 XP is between 1000 (level 4) and 1500 (level 5)
      const info = getLevelInfo(1200);
      expect(info.level).toBe(4);
      expect(info.title).toBe("Disciplined");
    });
  });

  describe("titles", () => {
    const expectedTitles = [
      "Novice",
      "Apprentice",
      "Focused",
      "Dedicated",
      "Disciplined",
      "Mindful",
      "Centered",
      "Enlightened",
      "Master",
      "Grandmaster",
      "Sage",
      "Oracle",
      "Transcendent",
      "Legendary",
      "Mythic",
      "Cosmic",
      "Eternal",
      "Infinite",
      "Ascended",
      "Ultimate",
    ];

    const thresholds = [
      0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000,
      13000, 17000, 22000, 28000, 35000, 43000, 52000, 65000,
    ];

    it.each(thresholds.map((xp, i) => [i, xp, expectedTitles[i]!]))(
      "level %i at %i XP has title %s",
      (level, xp, title) => {
        const info = getLevelInfo(xp as number);
        expect(info.level).toBe(level);
        expect(info.title).toBe(title);
      },
    );
  });

  describe("progress calculation", () => {
    it("returns progress 0 at exact level threshold", () => {
      // Level 1 starts at 100, next at 300 → progress = 0/200 = 0
      const info = getLevelInfo(100);
      expect(info.progress).toBe(0);
    });

    it("returns progress 0.5 at halfway through a level", () => {
      // Level 1: 100-300, midpoint = 200 → progress = 100/200 = 0.5
      const info = getLevelInfo(200);
      expect(info.progress).toBe(0.5);
    });

    it("returns progress close to 1 just before next level", () => {
      // Level 1: 100-300, at 299 → progress = 199/200 = 0.995
      const info = getLevelInfo(299);
      expect(info.progress).toBeCloseTo(0.995, 2);
    });

    it("returns progress 1 at max level (no next level)", () => {
      const info = getLevelInfo(65000);
      expect(info.progress).toBe(1);
    });

    it("returns progress 1 when XP exceeds max level", () => {
      const info = getLevelInfo(100000);
      expect(info.progress).toBe(1);
    });

    it("returns progress 0 at 0 XP (within level 0)", () => {
      // Level 0: 0-100, progress = 0/100 = 0
      const info = getLevelInfo(0);
      expect(info.progress).toBe(0);
    });

    it("returns correct xpForCurrentLevel and xpForNextLevel", () => {
      const info = getLevelInfo(500);
      // Level 2 (300-600)
      expect(info.xpForCurrentLevel).toBe(300);
      expect(info.xpForNextLevel).toBe(600);
    });

    it("currentXP matches input", () => {
      const info = getLevelInfo(1234);
      expect(info.currentXP).toBe(1234);
    });
  });
});

// ──────────────────── getXPThreshold ────────────────────

describe("getXPThreshold", () => {
  it("returns 0 for level 0", () => {
    expect(getXPThreshold(0)).toBe(0);
  });

  it("returns 100 for level 1", () => {
    expect(getXPThreshold(1)).toBe(100);
  });

  it("returns 65000 for max level 19", () => {
    expect(getXPThreshold(19)).toBe(65000);
  });

  it("returns 0 for negative levels", () => {
    expect(getXPThreshold(-1)).toBe(0);
    expect(getXPThreshold(-100)).toBe(0);
  });

  it("returns max threshold for levels beyond max", () => {
    expect(getXPThreshold(20)).toBe(65000);
    expect(getXPThreshold(100)).toBe(65000);
  });

  it("returns correct thresholds for all defined levels", () => {
    const thresholds = [
      0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000,
      13000, 17000, 22000, 28000, 35000, 43000, 52000, 65000,
    ];
    for (let level = 0; level <= 19; level++) {
      expect(getXPThreshold(level)).toBe(thresholds[level]);
    }
  });
});
