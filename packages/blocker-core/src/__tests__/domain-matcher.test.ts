import { matchesDomain, isDomainBlocked } from "../domain-matcher";
import type { DomainRule } from "@focus-shield/shared-types";

describe("matchesDomain", () => {
  describe("wildcard patterns (*.domain.com)", () => {
    it("matches www.reddit.com against *.reddit.com", () => {
      expect(matchesDomain("www.reddit.com", "*.reddit.com")).toBe(true);
    });

    it("matches old.reddit.com against *.reddit.com", () => {
      expect(matchesDomain("old.reddit.com", "*.reddit.com")).toBe(true);
    });

    it("matches sub.domain.reddit.com against *.reddit.com", () => {
      expect(matchesDomain("sub.domain.reddit.com", "*.reddit.com")).toBe(
        true,
      );
    });

    it("does NOT match reddit.com itself against *.reddit.com", () => {
      expect(matchesDomain("reddit.com", "*.reddit.com")).toBe(false);
    });

    it("does NOT match evilreddit.com against *.reddit.com", () => {
      expect(matchesDomain("evilreddit.com", "*.reddit.com")).toBe(false);
    });
  });

  describe("exact domain patterns", () => {
    it("matches reddit.com against reddit.com", () => {
      expect(matchesDomain("reddit.com", "reddit.com")).toBe(true);
    });

    it("does NOT match www.reddit.com against exact reddit.com", () => {
      expect(matchesDomain("www.reddit.com", "reddit.com")).toBe(false);
    });

    it("does NOT match old.reddit.com against exact reddit.com", () => {
      expect(matchesDomain("old.reddit.com", "reddit.com")).toBe(false);
    });
  });

  describe("path-based patterns", () => {
    it("matches youtube.com/shorts/abc against youtube.com/shorts/*", () => {
      expect(matchesDomain("youtube.com/shorts/abc", "youtube.com/shorts/*")).toBe(
        true,
      );
    });

    it("matches youtube.com/shorts/abc/def against youtube.com/shorts/*", () => {
      expect(
        matchesDomain("youtube.com/shorts/abc/def", "youtube.com/shorts/*"),
      ).toBe(true);
    });

    it("does NOT match youtube.com/watch against youtube.com/shorts/*", () => {
      expect(
        matchesDomain("youtube.com/watch", "youtube.com/shorts/*"),
      ).toBe(false);
    });

    it("does NOT match youtube.com/ against youtube.com/shorts/*", () => {
      expect(matchesDomain("youtube.com/", "youtube.com/shorts/*")).toBe(
        false,
      );
    });

    it("matches youtube.com/feed/subscriptions against youtube.com/feed/*", () => {
      expect(
        matchesDomain("youtube.com/feed/subscriptions", "youtube.com/feed/*"),
      ).toBe(true);
    });
  });

  describe("URL with protocol", () => {
    it("matches https://www.reddit.com against *.reddit.com", () => {
      expect(matchesDomain("https://www.reddit.com", "*.reddit.com")).toBe(
        true,
      );
    });

    it("matches http://www.reddit.com against *.reddit.com", () => {
      expect(matchesDomain("http://www.reddit.com", "*.reddit.com")).toBe(
        true,
      );
    });

    it("matches https://reddit.com against reddit.com", () => {
      expect(matchesDomain("https://reddit.com", "reddit.com")).toBe(true);
    });

    it("matches https://youtube.com/shorts/xyz against youtube.com/shorts/*", () => {
      expect(
        matchesDomain(
          "https://youtube.com/shorts/xyz",
          "youtube.com/shorts/*",
        ),
      ).toBe(true);
    });

    it("matches URL with path after protocol against wildcard domain", () => {
      expect(
        matchesDomain(
          "https://www.reddit.com/r/programming",
          "*.reddit.com",
        ),
      ).toBe(true);
    });
  });

  describe("case insensitivity", () => {
    it("matches WWW.REDDIT.COM against *.reddit.com", () => {
      expect(matchesDomain("WWW.REDDIT.COM", "*.reddit.com")).toBe(true);
    });

    it("matches www.reddit.com against *.REDDIT.COM", () => {
      expect(matchesDomain("www.reddit.com", "*.REDDIT.COM")).toBe(true);
    });

    it("matches REDDIT.COM against reddit.com", () => {
      expect(matchesDomain("REDDIT.COM", "reddit.com")).toBe(true);
    });

    it("matches YouTube.com/Shorts/ABC against youtube.com/shorts/*", () => {
      expect(
        matchesDomain("YouTube.com/Shorts/ABC", "youtube.com/shorts/*"),
      ).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles whitespace in URL", () => {
      expect(matchesDomain("  www.reddit.com  ", "*.reddit.com")).toBe(true);
    });

    it("handles whitespace in pattern", () => {
      expect(matchesDomain("www.reddit.com", "  *.reddit.com  ")).toBe(true);
    });

    it("does not match unrelated domains", () => {
      expect(matchesDomain("www.google.com", "*.reddit.com")).toBe(false);
    });

    it("exact path match without wildcard", () => {
      expect(
        matchesDomain("youtube.com/shorts", "youtube.com/shorts"),
      ).toBe(true);
    });

    it("does not match when path differs without wildcard", () => {
      expect(
        matchesDomain("youtube.com/shorts/abc", "youtube.com/shorts"),
      ).toBe(false);
    });
  });
});

describe("isDomainBlocked", () => {
  const blockRules: DomainRule[] = [
    { pattern: "*.reddit.com", type: "block" },
    { pattern: "*.facebook.com", type: "block" },
    { pattern: "youtube.com/shorts/*", type: "block" },
  ];

  const allowRules: DomainRule[] = [
    { pattern: "*.reddit.com/r/learnprogramming", type: "allow" },
  ];

  it("returns true for a blocked domain", () => {
    expect(isDomainBlocked("www.reddit.com", blockRules, [])).toBe(true);
  });

  it("returns true for another blocked domain", () => {
    expect(isDomainBlocked("m.facebook.com", blockRules, [])).toBe(true);
  });

  it("returns true for blocked path pattern", () => {
    expect(
      isDomainBlocked("youtube.com/shorts/abc", blockRules, []),
    ).toBe(true);
  });

  it("returns false for a non-blocked domain", () => {
    expect(isDomainBlocked("www.google.com", blockRules, [])).toBe(false);
  });

  it("returns false for a non-blocked path", () => {
    expect(isDomainBlocked("youtube.com/watch?v=abc", blockRules, [])).toBe(
      false,
    );
  });

  it("allow rules override block rules", () => {
    const broadBlockRules: DomainRule[] = [
      { pattern: "*.reddit.com", type: "block" },
    ];
    const specificAllowRules: DomainRule[] = [
      { pattern: "*.reddit.com", type: "allow" },
    ];

    expect(
      isDomainBlocked(
        "www.reddit.com",
        broadBlockRules,
        specificAllowRules,
      ),
    ).toBe(false);
  });

  it("returns false when URL matches both block and allow rules", () => {
    expect(
      isDomainBlocked("www.reddit.com/r/learnprogramming", blockRules, allowRules),
    ).toBe(false);
  });

  it("returns true when URL matches block but not allow rules", () => {
    expect(
      isDomainBlocked("www.reddit.com/r/memes", blockRules, allowRules),
    ).toBe(true);
  });

  it("returns false when block rules list is empty", () => {
    expect(isDomainBlocked("www.reddit.com", [], [])).toBe(false);
  });

  it("returns false when both rules lists are empty", () => {
    expect(isDomainBlocked("anything.com", [], [])).toBe(false);
  });

  it("returns false when only allow rules exist (no block match)", () => {
    expect(
      isDomainBlocked("www.reddit.com", [], allowRules),
    ).toBe(false);
  });
});
