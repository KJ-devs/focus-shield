import { parseMarkdown } from "../src/markdown-parser";

describe("parseMarkdown", () => {
  it("should extract H2 sections with their content", () => {
    const md = "## Introduction\nThis is the intro paragraph.";

    const result = parseMarkdown(md);

    expect(result).toHaveLength(1);
    expect(result[0]?.heading).toBe("Introduction");
    expect(result[0]?.level).toBe(2);
    expect(result[0]?.content).toBe("This is the intro paragraph.");
  });

  it("should extract H3 sections with their content", () => {
    const md = "### Sub-section\nSome details here.";

    const result = parseMarkdown(md);

    expect(result).toHaveLength(1);
    expect(result[0]?.heading).toBe("Sub-section");
    expect(result[0]?.level).toBe(3);
    expect(result[0]?.content).toBe("Some details here.");
  });

  it("should ignore H1 headings", () => {
    const md = "# Title\nThis content is under H1.\n## Actual Section\nVisible content.";

    const result = parseMarkdown(md);

    expect(result).toHaveLength(1);
    expect(result[0]?.heading).toBe("Actual Section");
  });

  it("should extract bold terms from section content", () => {
    const md = "## Terms\nThe **mitochondria** is the powerhouse of the cell.";

    const result = parseMarkdown(md);

    expect(result[0]?.boldTerms).toEqual(["mitochondria"]);
  });

  it("should handle multiple sections", () => {
    const md = [
      "## First",
      "Content one.",
      "## Second",
      "Content two.",
      "## Third",
      "Content three.",
    ].join("\n");

    const result = parseMarkdown(md);

    expect(result).toHaveLength(3);
    expect(result[0]?.heading).toBe("First");
    expect(result[1]?.heading).toBe("Second");
    expect(result[2]?.heading).toBe("Third");
  });

  it("should handle sections with no content", () => {
    const md = "## Empty Section\n## Next Section\nHas content.";

    const result = parseMarkdown(md);

    expect(result).toHaveLength(2);
    expect(result[0]?.heading).toBe("Empty Section");
    expect(result[0]?.content).toBe("");
    expect(result[1]?.heading).toBe("Next Section");
    expect(result[1]?.content).toBe("Has content.");
  });

  it("should handle content with multiple bold terms", () => {
    const md =
      "## Definitions\nA **neuron** sends **signals** through **axons**.";

    const result = parseMarkdown(md);

    expect(result[0]?.boldTerms).toEqual(["neuron", "signals", "axons"]);
  });

  it("should return empty array for empty content", () => {
    const result = parseMarkdown("");

    expect(result).toEqual([]);
  });

  it("should return empty array for content with only H1", () => {
    const md = "# Top Level Title\nSome text under H1.";

    const result = parseMarkdown(md);

    expect(result).toEqual([]);
  });

  it("should handle nested headings (H2 then H3)", () => {
    const md = [
      "## Parent Section",
      "Parent content.",
      "### Child Section",
      "Child content.",
    ].join("\n");

    const result = parseMarkdown(md);

    expect(result).toHaveLength(2);
    expect(result[0]?.heading).toBe("Parent Section");
    expect(result[0]?.level).toBe(2);
    expect(result[0]?.content).toBe("Parent content.");
    expect(result[1]?.heading).toBe("Child Section");
    expect(result[1]?.level).toBe(3);
    expect(result[1]?.content).toBe("Child content.");
  });
});
