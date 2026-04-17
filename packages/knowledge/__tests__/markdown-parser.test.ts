import { parseMarkdown, extractListItems, extractDefinitions } from "../src/markdown-parser";

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

  it("should ignore H1 headings but keep content below them", () => {
    const md = "# Title\nThis content is under H1.\n## Actual Section\nVisible content.";

    const result = parseMarkdown(md);

    expect(result).toHaveLength(2);
    expect(result[0]?.heading).toBe("Notes");
    expect(result[0]?.content).toBe("This content is under H1.");
    expect(result[1]?.heading).toBe("Actual Section");
    expect(result[1]?.content).toBe("Visible content.");
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

  it("should create default section for content under H1 only", () => {
    const md = "# Top Level Title\nSome text under H1.";

    const result = parseMarkdown(md);

    // H1 is ignored, but content below it creates a default "Notes" section
    expect(result).toHaveLength(1);
    expect(result[0]?.heading).toBe("Notes");
    expect(result[0]?.content).toBe("Some text under H1.");
  });

  it("should parse HTML content from TipTap editor", () => {
    const html = "<h2>Overview</h2><p>This is <strong>important</strong> content.</p>";

    const result = parseMarkdown(html);

    expect(result).toHaveLength(1);
    expect(result[0]?.heading).toBe("Overview");
    expect(result[0]?.boldTerms).toContain("important");
  });

  it("should create default section for HTML without headings", () => {
    const html = "<p>Just a paragraph with <strong>bold</strong> text.</p>";

    const result = parseMarkdown(html);

    expect(result).toHaveLength(1);
    expect(result[0]?.heading).toBe("Notes");
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

describe("extractListItems", () => {
  it("should extract unordered list items", () => {
    const content = "- Item one\n- Item two\n- Item three";

    const items = extractListItems(content);

    expect(items).toEqual(["Item one", "Item two", "Item three"]);
  });

  it("should extract ordered list items", () => {
    const content = "1. First\n2. Second\n3. Third";

    const items = extractListItems(content);

    expect(items).toEqual(["First", "Second", "Third"]);
  });

  it("should return empty for non-list content", () => {
    const content = "Just a paragraph of text.";

    const items = extractListItems(content);

    expect(items).toEqual([]);
  });
});

describe("extractDefinitions", () => {
  it("should extract definition patterns with bold terms", () => {
    const content = "**Polymorphism** is the ability of objects to take many forms in programming.";

    const defs = extractDefinitions(content);

    expect(defs.length).toBeGreaterThanOrEqual(1);
    expect(defs[0]?.term).toBe("Polymorphism");
  });

  it("should return empty for content without definition patterns", () => {
    const content = "Some random text without definitions.";

    const defs = extractDefinitions(content);

    expect(defs).toEqual([]);
  });
});
