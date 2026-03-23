import type { Flashcard, QuizQuestion } from "./types";

const DEFAULT_QUIZ_COUNT = 10;
const CHOICES_COUNT = 4;
const FALLBACK_CHOICE = "None of the above";

export function generateQuiz(
  cards: Flashcard[],
  count?: number,
): QuizQuestion[] {
  if (cards.length === 0) return [];

  const targetCount = Math.min(count ?? DEFAULT_QUIZ_COUNT, cards.length);
  const shuffled = shuffleArray([...cards]);
  const selected = shuffled.slice(0, targetCount);

  return selected.map((card) => buildQuestion(card, cards));
}

function buildQuestion(card: Flashcard, allCards: Flashcard[]): QuizQuestion {
  const correctAnswer = card.back;

  // Collect distractor candidates (other cards' backs, excluding duplicates of correct answer)
  const distractors = allCards
    .filter((c) => c.id !== card.id && c.back !== correctAnswer)
    .map((c) => c.back);

  const uniqueDistractors = [...new Set(distractors)];
  const shuffledDistractors = shuffleArray(uniqueDistractors);

  const neededDistractors = CHOICES_COUNT - 1;
  const selectedDistractors = shuffledDistractors.slice(0, neededDistractors);

  // Pad with fallback if not enough distractors
  while (selectedDistractors.length < neededDistractors) {
    selectedDistractors.push(FALLBACK_CHOICE);
  }

  // Build choices and randomize order
  const choices = [correctAnswer, ...selectedDistractors];
  const shuffledChoices = shuffleArray(choices);
  const correctIndex = shuffledChoices.indexOf(correctAnswer);

  return { card, choices: shuffledChoices, correctIndex };
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
