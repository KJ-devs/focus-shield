import type { Flashcard } from "./types";
import { parseMarkdown, extractListItems, extractDefinitions } from "./markdown-parser";
import { createNewCard } from "./spaced-repetition";

type GeneratedCard = Omit<Flashcard, "id" | "createdAt">;

export interface GenerationResult {
  cards: GeneratedCard[];
  warnings: string[];
}

export function generateCardsFromDocument(
  documentId: string,
  folderId: string,
  content: string,
): GeneratedCard[] {
  return generateCardsWithFeedback(documentId, folderId, content).cards;
}

export function generateCardsWithFeedback(
  documentId: string,
  folderId: string,
  content: string,
): GenerationResult {
  const warnings: string[] = [];

  if (!content || !content.trim()) {
    warnings.push("Document is empty — write some content first");
    return { cards: [], warnings };
  }

  const sections = parseMarkdown(content);

  if (sections.length === 0) {
    warnings.push("No content sections found — add headings (## Title) to structure your notes");
    return { cards: [], warnings };
  }

  const cards: GeneratedCard[] = [];
  const now = new Date();
  const sm2Defaults = createNewCard();
  const seenFronts = new Set<string>();

  function addCard(front: string, back: string, type: GeneratedCard["type"]): void {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();
    if (!trimmedFront || !trimmedBack) return;
    if (trimmedBack.length < 3) return;

    const key = `${type}:${trimmedFront.toLowerCase()}`;
    if (seenFronts.has(key)) return;
    seenFronts.add(key);

    cards.push({
      documentId,
      folderId,
      front: trimmedFront,
      back: trimmedBack,
      type,
      ...sm2Defaults,
      nextReviewAt: now,
      lastReviewedAt: null,
    });
  }

  for (const section of sections) {
    if (!section.content) continue;

    // 1. QA card: heading → content
    addCard(section.heading, section.content, "qa");

    // 2. Cloze cards from bold terms (deduplicated)
    const boldTerms = [...new Set(section.boldTerms)];
    for (const term of boldTerms) {
      const clozeText = section.content.replace(
        new RegExp(`\\*\\*${escapeRegex(term)}\\*\\*`, "g"),
        "[...]",
      );
      if (clozeText !== section.content) {
        addCard(clozeText, term, "cloze");
      }
    }

    // 3. Definition cards from "X is Y" patterns
    const definitions = extractDefinitions(section.content);
    for (const def of definitions) {
      addCard(`What is ${def.term}?`, def.definition, "definition");
    }

    // 4. List cards: if section has list items, create a "name the items" card
    const listItems = extractListItems(section.content);
    if (listItems.length >= 2) {
      addCard(
        `What are the key points of: ${section.heading}?`,
        listItems.map((item, i) => `${i + 1}. ${item}`).join("\n"),
        "list",
      );
    }
  }

  if (cards.length === 0) {
    warnings.push("No cards could be generated — try adding ## headings, **bold terms**, or structured lists");
  }

  return { cards, warnings };
}

export function createManualCard(
  folderId: string,
  front: string,
  back: string,
): GeneratedCard {
  const sm2Defaults = createNewCard();

  return {
    documentId: null,
    folderId,
    front: front.trim(),
    back: back.trim(),
    type: "basic",
    ...sm2Defaults,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
