import { timingSafeEqual } from "../verifier";

describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("hello-world", "hello-world")).toBe(true);
  });

  it("returns true for two empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqual("abcdef", "abcdeg")).toBe(false);
  });

  it("returns false for strings of different lengths", () => {
    expect(timingSafeEqual("short", "a-much-longer-string")).toBe(false);
  });

  it("returns false for empty vs non-empty string", () => {
    expect(timingSafeEqual("", "non-empty")).toBe(false);
  });

  it("returns false for non-empty vs empty string", () => {
    expect(timingSafeEqual("non-empty", "")).toBe(false);
  });

  it("returns true for long identical strings", () => {
    const longStr = "a".repeat(1000);
    expect(timingSafeEqual(longStr, longStr)).toBe(true);
  });

  it("returns false for strings that differ only by case", () => {
    expect(timingSafeEqual("Hello", "hello")).toBe(false);
  });
});
