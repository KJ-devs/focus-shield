import type { Flashcard, QuizQuestion, QuizQuestionType } from "./types";

const DEFAULT_QUIZ_COUNT = 10;
const CHOICES_COUNT = 4;

export function generateQuiz(
  cards: Flashcard[],
  count?: number,
): QuizQuestion[] {
  if (cards.length === 0) return [];

  const targetCount = Math.min(count ?? DEFAULT_QUIZ_COUNT, cards.length);
  const shuffled = shuffleArray([...cards]);
  const selected = shuffled.slice(0, targetCount);

  return selected.map((card, i) => {
    const qType = pickQuestionType(card, cards.length, i);
    switch (qType) {
      case "truefalse":
        return buildTrueFalse(card, cards);
      case "fillin":
        return buildFillIn(card);
      default:
        return buildMCQ(card, cards);
    }
  });
}

/**
 * Pick question type for variety. Roughly 50% MCQ, 25% T/F, 25% fill-in.
 * Fill-in only works for cloze/definition cards.
 */
function pickQuestionType(card: Flashcard, totalCards: number, index: number): QuizQuestionType {
  // Need at least 2 cards for MCQ distractors
  if (totalCards < 2) return "fillin";

  // Cloze and definition cards work great as fill-in
  if ((card.type === "cloze" || card.type === "definition") && index % 3 === 2) {
    return "fillin";
  }

  // Alternate between MCQ and T/F
  if (index % 4 === 1) return "truefalse";

  return "mcq";
}

/**
 * Multiple choice question with 4 options.
 */
function buildMCQ(card: Flashcard, allCards: Flashcard[]): QuizQuestion {
  const correctAnswer = card.back;

  const distractors = allCards
    .filter((c) => c.id !== card.id && c.back !== correctAnswer)
    .map((c) => c.back);

  const uniqueDistractors = [...new Set(distractors)];
  const shuffledDistractors = shuffleArray(uniqueDistractors);

  const neededDistractors = CHOICES_COUNT - 1;
  const selectedDistractors = shuffledDistractors.slice(0, neededDistractors);

  while (selectedDistractors.length < neededDistractors) {
    const fallbacks = ["None of the above", "All of the above", "Not enough information"];
    const fb = fallbacks[selectedDistractors.length % fallbacks.length];
    if (fb && !selectedDistractors.includes(fb)) {
      selectedDistractors.push(fb);
    } else {
      break;
    }
  }

  const choices = [correctAnswer, ...selectedDistractors];
  const shuffledChoices = shuffleArray(choices);
  const correctIndex = shuffledChoices.indexOf(correctAnswer);

  return {
    card,
    questionType: "mcq",
    questionText: card.front,
    choices: shuffledChoices,
    correctIndex,
  };
}

/**
 * True/False question: show a statement that is either correct or has
 * the answer swapped with another card's answer.
 */
function buildTrueFalse(card: Flashcard, allCards: Flashcard[]): QuizQuestion {
  const isTrue = Math.random() > 0.5;

  if (isTrue) {
    // Statement is correct
    const statement = formatTrueFalseStatement(card.front, card.back);
    return {
      card,
      questionType: "truefalse",
      questionText: statement,
      choices: ["True", "False"],
      correctIndex: 0,
    };
  }

  // Statement is false — swap with another card's answer
  const others = allCards.filter((c) => c.id !== card.id && c.back !== card.back);
  if (others.length === 0) {
    // Fallback to true if no other cards
    const statement = formatTrueFalseStatement(card.front, card.back);
    return {
      card,
      questionType: "truefalse",
      questionText: statement,
      choices: ["True", "False"],
      correctIndex: 0,
    };
  }

  const wrongCard = others[Math.floor(Math.random() * others.length)];
  const statement = formatTrueFalseStatement(card.front, wrongCard?.back ?? card.back);

  return {
    card,
    questionType: "truefalse",
    questionText: statement,
    choices: ["True", "False"],
    correctIndex: 1,
  };
}

function formatTrueFalseStatement(front: string, back: string): string {
  // If front ends with ?, turn it into a statement
  const cleanFront = front.replace(/\?$/, "").trim();
  const shortBack = back.length > 80 ? back.slice(0, 77) + "..." : back;
  return `${cleanFront}: ${shortBack}`;
}

/**
 * Fill-in-the-blank: user must type the answer (checked in UI).
 * Uses a single choice containing the correct answer for validation.
 */
function buildFillIn(card: Flashcard): QuizQuestion {
  const questionText = card.type === "cloze"
    ? card.front
    : `What is ${card.front.replace(/\?$/, "")}?`;

  return {
    card,
    questionType: "fillin",
    questionText,
    choices: [card.back],
    correctIndex: 0,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = temp;
  }
  return array;
}
