import {
  generateCardsFromDocument,
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

    expect(cards).toHaveLength(1);
    expect(cards[0]?.front).toBe("Has Content");
  });

  it("should generate both QA and cloze cards from a section with bold text", () => {
    const content = "## Overview\n**TypeScript** is a typed superset of JS.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    const qaCards = cards.filter((c) => c.type === "qa");
    const clozeCards = cards.filter((c) => c.type === "cloze");
    expect(qaCards).toHaveLength(1);
    expect(clozeCards).toHaveLength(1);
  });

  it("should handle document with no headings", () => {
    const content = "Just some plain text without any headings.";

    const cards = generateCardsFromDocument(docId, folderId, content);

    expect(cards).toHaveLength(0);
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
});
