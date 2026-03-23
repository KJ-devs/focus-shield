import { generateQuiz } from "../src/quiz-engine";
import type { Flashcard } from "../src/types";

function buildFlashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: crypto.randomUUID(),
    documentId: null,
    folderId: "folder-1",
    front: "Default question",
    back: "Default answer",
    type: "basic",
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("generateQuiz", () => {
  it("should return empty array for empty cards", () => {
    const result = generateQuiz([]);

    expect(result).toEqual([]);
  });

  it("should generate questions with 4 choices each", () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 3);

    for (const question of quiz) {
      expect(question.choices).toHaveLength(4);
    }
  });

  it("should include the correct answer in choices", () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 5);

    for (const question of quiz) {
      expect(question.choices).toContain(question.card.back);
    }
  });

  it("should set correctIndex to the position of the correct answer", () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 5);

    for (const question of quiz) {
      expect(question.choices[question.correctIndex]).toBe(question.card.back);
    }
  });

  it("should limit to specified count", () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 5);

    expect(quiz).toHaveLength(5);
  });

  it("should default to 10 questions or fewer if not enough cards", () => {
    const manyCards = Array.from({ length: 15 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(manyCards);

    expect(quiz).toHaveLength(10);

    const fewCards = Array.from({ length: 3 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const smallQuiz = generateQuiz(fewCards);

    expect(smallQuiz).toHaveLength(3);
  });

  it("should pad with fallback choice when fewer than 4 cards available", () => {
    const cards = [
      buildFlashcard({ front: "Q1", back: "A1" }),
      buildFlashcard({ front: "Q2", back: "A2" }),
    ];

    const quiz = generateQuiz(cards, 1);

    expect(quiz).toHaveLength(1);
    expect(quiz[0]?.choices).toHaveLength(4);
    expect(quiz[0]?.choices).toContain("None of the above");
  });
});
