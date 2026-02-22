import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("attempt", () => {
    it("allows the first attempt", () => {
      const limiter = new RateLimiter();
      const result = limiter.attempt("key-1");
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(2);
      expect(result.cooldownRemainingMs).toBe(0);
    });

    it("allows up to maxAttempts - 1 attempts", () => {
      const limiter = new RateLimiter();
      const first = limiter.attempt("key-1");
      expect(first.allowed).toBe(true);
      expect(first.remainingAttempts).toBe(2);

      const second = limiter.attempt("key-1");
      expect(second.allowed).toBe(true);
      expect(second.remainingAttempts).toBe(1);
    });

    it("triggers cooldown on the 3rd attempt (default maxAttempts=3)", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      const third = limiter.attempt("key-1");
      expect(third.allowed).toBe(false);
      expect(third.remainingAttempts).toBe(0);
      expect(third.cooldownRemainingMs).toBe(300_000);
    });

    it("rejects subsequent attempts during cooldown", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1"); // triggers cooldown

      vi.advanceTimersByTime(10_000); // only 10s elapsed

      const result = limiter.attempt("key-1");
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.cooldownRemainingMs).toBe(290_000);
    });

    it("auto-resets after cooldown expires and allows new attempts", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1"); // triggers cooldown

      vi.advanceTimersByTime(300_000); // full cooldown elapsed

      const result = limiter.attempt("key-1");
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(2);
      expect(result.cooldownRemainingMs).toBe(0);
    });
  });

  describe("isLocked", () => {
    it("returns false when no attempts have been made", () => {
      const limiter = new RateLimiter();
      expect(limiter.isLocked("key-1")).toBe(false);
    });

    it("returns false after only 1 attempt", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      expect(limiter.isLocked("key-1")).toBe(false);
    });

    it("returns true during cooldown", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      expect(limiter.isLocked("key-1")).toBe(true);
    });

    it("returns false after cooldown expires", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      vi.advanceTimersByTime(300_000);
      expect(limiter.isLocked("key-1")).toBe(false);
    });
  });

  describe("getRemainingCooldownMs", () => {
    it("returns 0 when no attempts have been made", () => {
      const limiter = new RateLimiter();
      expect(limiter.getRemainingCooldownMs("key-1")).toBe(0);
    });

    it("returns 0 when not in cooldown", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      expect(limiter.getRemainingCooldownMs("key-1")).toBe(0);
    });

    it("returns full cooldown time right after lockout", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      expect(limiter.getRemainingCooldownMs("key-1")).toBe(300_000);
    });

    it("decreases over time", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      vi.advanceTimersByTime(100_000);
      expect(limiter.getRemainingCooldownMs("key-1")).toBe(200_000);
    });

    it("returns 0 after cooldown expires", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      vi.advanceTimersByTime(300_000);
      expect(limiter.getRemainingCooldownMs("key-1")).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears attempts and allows new attempts", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");

      limiter.reset("key-1");

      const result = limiter.attempt("key-1");
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(2);
    });

    it("clears cooldown state", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1"); // triggers cooldown

      expect(limiter.isLocked("key-1")).toBe(true);

      limiter.reset("key-1");

      expect(limiter.isLocked("key-1")).toBe(false);
      expect(limiter.getRemainingCooldownMs("key-1")).toBe(0);
    });

    it("does not affect other keys", () => {
      const limiter = new RateLimiter();
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1"); // key-1 locked

      limiter.attempt("key-2");
      limiter.attempt("key-2");
      limiter.attempt("key-2"); // key-2 locked

      limiter.reset("key-1");

      expect(limiter.isLocked("key-1")).toBe(false);
      expect(limiter.isLocked("key-2")).toBe(true);
    });
  });

  describe("custom configuration", () => {
    it("respects custom maxAttempts", () => {
      const limiter = new RateLimiter({ maxAttempts: 5 });

      for (let i = 0; i < 4; i++) {
        const result = limiter.attempt("key-1");
        expect(result.allowed).toBe(true);
      }

      const fifth = limiter.attempt("key-1");
      expect(fifth.allowed).toBe(false);
    });

    it("respects custom cooldownMs", () => {
      const limiter = new RateLimiter({ cooldownMs: 60_000 });
      limiter.attempt("key-1");
      limiter.attempt("key-1");
      limiter.attempt("key-1"); // triggers cooldown

      expect(limiter.getRemainingCooldownMs("key-1")).toBe(60_000);

      vi.advanceTimersByTime(60_000);
      expect(limiter.isLocked("key-1")).toBe(false);
    });
  });

  describe("independent key tracking", () => {
    it("tracks different keys independently", () => {
      const limiter = new RateLimiter();

      limiter.attempt("key-a");
      limiter.attempt("key-a");
      limiter.attempt("key-a"); // key-a locked

      const resultB = limiter.attempt("key-b");
      expect(resultB.allowed).toBe(true);
      expect(resultB.remainingAttempts).toBe(2);

      expect(limiter.isLocked("key-a")).toBe(true);
      expect(limiter.isLocked("key-b")).toBe(false);
    });
  });
});
