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

  it("should have valid correctIndex for all question types", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 10);

    for (const question of quiz) {
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.choices.length);

      if (question.questionType === "mcq") {
        expect(question.choices[question.correctIndex]).toBe(question.card.back);
      } else if (question.questionType === "truefalse") {
        expect(["True", "False"]).toContain(question.choices[question.correctIndex]);
      } else if (question.questionType === "fillin") {
        expect(question.choices[0]).toBe(question.card.back);
      }
    }
  });

  it("should generate MCQ questions with 4 choices", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 10);
    const mcqQuestions = quiz.filter((q) => q.questionType === "mcq");

    for (const question of mcqQuestions) {
      expect(question.choices).toHaveLength(4);
    }
  });

  it("should generate true/false questions with 2 choices", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 10);
    const tfQuestions = quiz.filter((q) => q.questionType === "truefalse");

    for (const question of tfQuestions) {
      expect(question.choices).toHaveLength(2);
      expect(question.choices).toContain("True");
      expect(question.choices).toContain("False");
    }
  });

  it("should generate fill-in questions with 1 choice (the answer)", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}`, type: "cloze" }),
    );

    const quiz = generateQuiz(cards, 10);
    const fillQuestions = quiz.filter((q) => q.questionType === "fillin");

    for (const question of fillQuestions) {
      expect(question.choices).toHaveLength(1);
      expect(question.choices[0]).toBe(question.card.back);
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

  it("should have a mix of question types for variety", () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 20);
    const types = new Set(quiz.map((q) => q.questionType));

    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it("should set questionText on all questions", () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      buildFlashcard({ front: `Q${i}`, back: `A${i}` }),
    );

    const quiz = generateQuiz(cards, 5);

    for (const question of quiz) {
      expect(question.questionText).toBeTruthy();
    }
  });

  it("should handle single card by using fillin type", () => {
    const cards = [buildFlashcard({ front: "Q1", back: "A1" })];

    const quiz = generateQuiz(cards, 1);

    expect(quiz).toHaveLength(1);
    expect(quiz[0]?.questionType).toBe("fillin");
  });
});
