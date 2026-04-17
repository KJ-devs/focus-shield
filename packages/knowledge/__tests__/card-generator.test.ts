import {
  generateCardsFromDocument,
  generateCardsWithFeedback,
  createManualCard,
} from "../src/card-generator";

describe("generateCardsFromDocument", () => {
  const docId = "doc-1";
  const folderId = "folder-1";

  it("should generate QA cards from H2 headings", () => {
    const content = "## What is Rust?\nA systems programming language.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const qaCards = cards.filter((c) => c.type === "qa");
    expect(qaCards).toHaveLength(1);
    expect(qaCards[0]?.front).toBe("What is Rust?");
    expect(qaCards[0]?.back).toBe("A systems programming language.");
  });

  it("should generate cloze cards from bold terms", () => {
    const content =
      "## Memory\n**Rust** uses a **borrow checker** for memory safety.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const clozeCards = cards.filter((c) => c.type === "cloze");
    expect(clozeCards).toHaveLength(2);
    expect(clozeCards[0]?.back).toBe("Rust");
    expect(clozeCards[0]?.front).toContain("[...]");
    expect(clozeCards[1]?.back).toBe("borrow checker");
  });

  it("should set SM-2 defaults on generated cards", () => {
    const content = "## Topic\nSome content here.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    expect(cards[0]?.ease).toBe(2.5);
    expect(cards[0]?.interval).toBe(0);
    expect(cards[0]?.repetitions).toBe(0);
    expect(cards[0]?.lastReviewedAt).toBeNull();
  });

  it("should set documentId and folderId on all cards", () => {
    const content = "## Section\nWith **bold** term.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    for (const card of cards) {
      expect(card.documentId).toBe(docId);
      expect(card.folderId).toBe(folderId);
    }
  });

  it("should not generate cards from empty sections", () => {
    const content = "## Empty\n## Also Empty\n## Has Content\nSomething.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const qaCards = cards.filter((c) => c.type === "qa");
    expect(qaCards).toHaveLength(1);
    expect(qaCards[0]?.front).toBe("Has Content");
  });

  it("should generate both QA and cloze cards from a section with bold text", () => {
    const content = "## Overview\n**TypeScript** is a typed superset of JS.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const qaCards = cards.filter((c) => c.type === "qa");
    const clozeCards = cards.filter((c) => c.type === "cloze");
    expect(qaCards).toHaveLength(1);
    expect(clozeCards).toHaveLength(1);
  });

  it("should generate cards from documents without headings using default section", () => {
    const content = "Just some plain text without any headings with a **bold term**.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    expect(cards.length).toBeGreaterThan(0);
    const qaCards = cards.filter((c) => c.type === "qa");
    expect(qaCards[0]?.front).toBe("Notes");
  });

  it("should return empty for completely empty content", () => {
    const cards = generateCardsFromDocument(docId, folderId, "");

    expect(cards).toHaveLength(0);
  });

  it("should deduplicate bold terms within a section", () => {
    const content = "## Topic\n**React** is great. **React** is fast.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const clozeCards = cards.filter((c) => c.type === "cloze");
    expect(clozeCards).toHaveLength(1);
  });

  it("should generate definition cards from 'X is Y' patterns", () => {
    const content = "## Concepts\n**Polymorphism** is the ability of objects to take many forms in programming.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const defCards = cards.filter((c) => c.type === "definition");
    expect(defCards.length).toBeGreaterThanOrEqual(1);
    expect(defCards[0]?.front).toContain("Polymorphism");
  });

  it("should generate list cards from sections with list items", () => {
    const content = "## Benefits\n- Fast performance\n- Type safety\n- Great tooling";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const listCards = cards.filter((c) => c.type === "list");
    expect(listCards).toHaveLength(1);
    expect(listCards[0]?.front).toContain("Benefits");
    expect(listCards[0]?.back).toContain("Fast performance");
  });
});

describe("generateCardsWithFeedback", () => {
  const docId = "doc-1";
  const folderId = "folder-1";

  it("should return warnings for empty content", () => {
    const result = generateCardsWithFeedback(docId, folderId, "");

    expect(result.cards).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should return no warnings for valid content", () => {
    const result = generateCardsWithFeedback(docId, folderId, "## Topic\nSome content.");

    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("createManualCard", () => {
  it("should create a basic card with given front and back", () => {
    const card = createManualCard("folder-1", "What is 2+2?", "4");

    expect(card.front).toBe("What is 2+2?");
    expect(card.back).toBe("4");
    expect(card.type).toBe("basic");
    expect(card.folderId).toBe("folder-1");
  });

  it("should set SM-2 defaults", () => {
    const card = createManualCard("folder-1", "Q", "A");

    expect(card.ease).toBe(2.5);
    expect(card.interval).toBe(0);
    expect(card.repetitions).toBe(0);
    expect(card.lastReviewedAt).toBeNull();
  });

  it("should set documentId to null", () => {
    const card = createManualCard("folder-1", "Q", "A");

    expect(card.documentId).toBeNull();
  });

  it("should trim whitespace from front and back", () => {
    const card = createManualCard("folder-1", "  Question  ", "  Answer  ");

    expect(card.front).toBe("Question");
    expect(card.back).toBe("Answer");
  });
});
