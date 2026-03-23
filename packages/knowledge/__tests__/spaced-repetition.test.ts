import { reviewCard, createNewCard, isDue } from "../src/spaced-repetition";

describe("reviewCard", () => {
  const baseCard = { ease: 2.5, interval: 10, repetitions: 3 };

  describe("rating: again", () => {
    it("should reset repetitions to 0 and set interval to 1 when rating is again", () => {
      const card = { ...baseCard };

      const result = reviewCard(card, "again");

      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it("should decrease ease by 0.2 when rating is again", () => {
      const card = { ease: 2.5, interval: 10, repetitions: 3 };

      const result = reviewCard(card, "again");

      expect(result.ease).toBeCloseTo(2.3);
    });

    it("should not decrease ease below 1.3 when rating is again", () => {
      const card = { ease: 1.4, interval: 10, repetitions: 3 };

      const result = reviewCard(card, "again");

      expect(result.ease).toBe(1.3);
    });
  });

  describe("rating: hard", () => {
    it("should multiply interval by 1.2 when rating is hard", () => {
      const card = { ease: 2.5, interval: 10, repetitions: 3 };

      const result = reviewCard(card, "hard");

      expect(result.interval).toBe(12); // Math.round(10 * 1.2)
    });

    it("should decrease ease by 0.15 when rating is hard", () => {
      const card = { ease: 2.5, interval: 10, repetitions: 3 };

      const result = reviewCard(card, "hard");

      expect(result.ease).toBeCloseTo(2.35);
    });
  });

  describe("rating: good", () => {
    it("should set interval to 1 for first good rating (repetitions=0)", () => {
      const card = { ease: 2.5, interval: 0, repetitions: 0 };

      const result = reviewCard(card, "good");

      expect(result.interval).toBe(1);
    });

    it("should set interval to 6 for second good rating (repetitions=1)", () => {
      const card = { ease: 2.5, interval: 1, repetitions: 1 };

      const result = reviewCard(card, "good");

      expect(result.interval).toBe(6);
    });

    it("should multiply interval by ease for subsequent good ratings", () => {
      const card = { ease: 2.5, interval: 6, repetitions: 2 };

      const result = reviewCard(card, "good");

      expect(result.interval).toBe(15); // Math.round(6 * 2.5)
    });

    it("should increment repetitions on good rating", () => {
      const card = { ease: 2.5, interval: 6, repetitions: 2 };

      const result = reviewCard(card, "good");

      expect(result.repetitions).toBe(3);
    });
  });

  describe("rating: easy", () => {
    it("should set interval to 1 for first easy rating (repetitions=0)", () => {
      const card = { ease: 2.5, interval: 0, repetitions: 0 };

      const result = reviewCard(card, "easy");

      expect(result.interval).toBe(1);
    });

    it("should multiply interval by ease*1.3 for subsequent easy ratings", () => {
      const card = { ease: 2.5, interval: 6, repetitions: 2 };

      const result = reviewCard(card, "easy");

      expect(result.interval).toBe(20); // Math.round(6 * 2.5 * 1.3)
    });

    it("should increase ease by 0.15 on easy rating", () => {
      const card = { ease: 2.5, interval: 6, repetitions: 2 };

      const result = reviewCard(card, "easy");

      expect(result.ease).toBeCloseTo(2.65);
    });
  });

  describe("nextReviewAt", () => {
    it("should calculate nextReviewAt as now + interval days", () => {
      vi.useFakeTimers();
      const now = new Date("2026-03-23T12:00:00Z");
      vi.setSystemTime(now);

      const card = { ease: 2.5, interval: 6, repetitions: 2 };

      const result = reviewCard(card, "good");

      const expectedDate = new Date(
        now.getTime() + result.interval * 24 * 60 * 60 * 1000,
      );
      expect(result.nextReviewAt.getTime()).toBe(expectedDate.getTime());

      vi.useRealTimers();
    });
  });
});

describe("createNewCard", () => {
  it("should return default SM-2 values (ease=2.5, interval=0, repetitions=0)", () => {
    const defaults = createNewCard();

    expect(defaults.ease).toBe(2.5);
    expect(defaults.interval).toBe(0);
    expect(defaults.repetitions).toBe(0);
  });
});

describe("isDue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true when nextReviewAt is in the past", () => {
    const card = { nextReviewAt: new Date("2026-03-22T12:00:00Z") };

    expect(isDue(card)).toBe(true);
  });

  it("should return true when nextReviewAt is now", () => {
    const card = { nextReviewAt: new Date("2026-03-23T12:00:00Z") };

    expect(isDue(card)).toBe(true);
  });

  it("should return false when nextReviewAt is in the future", () => {
    const card = { nextReviewAt: new Date("2026-03-24T12:00:00Z") };

    expect(isDue(card)).toBe(false);
  });
});
