import type { Flashcard } from "./types";
import { parseMarkdown } from "./markdown-parser";
import { createNewCard } from "./spaced-repetition";

type GeneratedCard = Omit<Flashcard, "id" | "createdAt">;

export function generateCardsFromDocument(
  documentId: string,
  folderId: string,
  content: string,
): GeneratedCard[] {
  const sections = parseMarkdown(content);
  const cards: GeneratedCard[] = [];
  const now = new Date();
  const sm2Defaults = createNewCard();

  for (const section of sections) {
    if (!section.content) continue;

    // QA card: heading as front, content as back
    cards.push({
      documentId,
      folderId,
      front: section.heading,
      back: section.content,
      type: "qa",
      ...sm2Defaults,
      nextReviewAt: now,
      lastReviewedAt: null,
    });

    // Cloze cards from bold terms
    for (const term of section.boldTerms) {
      const sentenceWithCloze = section.content.replace(
        `**${term}**`,
        "[...]",
      );
      cards.push({
        documentId,
        folderId,
        front: sentenceWithCloze,
        back: term,
        type: "cloze",
        ...sm2Defaults,
        nextReviewAt: now,
        lastReviewedAt: null,
      });
    }
  }

  return cards;
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
    front,
    back,
    type: "basic",
    ...sm2Defaults,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
  };
}
