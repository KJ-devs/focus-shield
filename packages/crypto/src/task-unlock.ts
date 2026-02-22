import { randomBytes } from "node:crypto";

/**
 * Types of challenges available for task-based unlocking.
 */
export type TaskType = "math" | "typing";

/**
 * Difficulty levels for unlock tasks.
 */
export type TaskDifficulty = "easy" | "medium" | "hard";

/**
 * A challenge task that must be completed before unlocking.
 */
export interface UnlockTask {
  /** Unique identifier for this task */
  id: string;
  /** The type of challenge */
  type: TaskType;
  /** The prompt to display to the user */
  prompt: string;
  /** The expected answer (exact match required) */
  expectedAnswer: string;
  /** Timestamp when the task was created */
  createdAt: number;
}

/**
 * Typing task sentences organized by difficulty.
 *
 * - Easy: 10-15 words, simple sentences
 * - Medium: 25-35 words, longer paragraphs
 * - Hard: 40-50 words, complex paragraphs with punctuation
 */
const TYPING_SENTENCES: Record<TaskDifficulty, readonly string[]> = {
  easy: [
    "The quick brown fox jumps over the lazy dog near the river bank.",
    "She sells seashells by the seashore every morning before sunrise.",
    "A journey of a thousand miles begins with a single determined step.",
    "The best time to plant a tree was twenty years ago today.",
    "Every expert was once a beginner who refused to give up trying.",
    "Focus is not about saying yes but about saying no to distractions.",
    "Small daily improvements over time lead to stunning extraordinary results.",
    "The only way to do great work is to love what you do.",
  ],
  medium: [
    "Deep work is the ability to focus without distraction on a cognitively demanding task. It is a skill that allows you to quickly master complicated information and produce better results in less time.",
    "The most dangerous distractions are the ones you do not even realize are distracting you. They creep into your workflow slowly and silently steal hours from your most productive time of the day.",
    "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort. You must choose to eliminate the noise and protect your attention.",
    "Your ability to concentrate is not fixed. Like a muscle, it grows stronger with deliberate practice and weakens with neglect. Every time you resist a distraction, you build your capacity for deeper focus.",
  ],
  hard: [
    "The difference between successful people and truly successful people is that truly successful people say no to almost everything. Warren Buffett's advice reminds us that protecting our time and attention is not selfish; it is essential for producing meaningful work that creates lasting impact in the world.",
    "In an economy where attention is the scarcest resource, the ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable. Those who cultivate this skill, and then make it the core of their working life, will thrive. Those who do not will struggle.",
    "Multitasking is a myth that has been thoroughly debunked by neuroscience research. When you think you are multitasking, your brain is actually switching rapidly between tasks, losing efficiency with each transition. The cognitive cost of these switches accumulates throughout the day, leaving you exhausted but feeling unproductive.",
    "The greatest threat to your productivity is not a lack of time, tools, or talent. It is the constant temptation of easy, immediately gratifying distractions that promise a brief escape from the discomfort of difficult, meaningful work. Recognizing this pattern is the first step toward breaking free from it.",
  ],
} as const;

/**
 * Math operation types for generating challenges.
 */
type MathOperation = "+" | "-" | "*";

/**
 * Generate a cryptographically random integer in the range [min, max] (inclusive).
 */
function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
  const maxValid = Math.floor((256 ** bytesNeeded) / range) * range;

  let value: number;
  do {
    const bytes = randomBytes(bytesNeeded);
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        value = value * 256 + byte;
      }
    }
  } while (value >= maxValid);

  return min + (value % range);
}

/**
 * Pick a random element from an array using cryptographic randomness.
 */
function randomPick<T>(arr: readonly T[]): T {
  const index = randomInt(0, arr.length - 1);
  // Safe because randomInt guarantees valid index within array bounds
  return arr[index] as T;
}

/**
 * Generate a random math challenge.
 *
 * Before unlocking, the user must solve an arithmetic problem.
 * This creates cognitive friction that helps break the impulsive
 * urge to check distracting sites.
 *
 * Difficulty levels:
 * - easy: 2-digit addition or subtraction (e.g., "47 + 83")
 * - medium: 2-digit multiplication (e.g., "23 x 47")
 * - hard: 3-digit multiplication (e.g., "847 x 29")
 *
 * Described in F2.5 of the project specification.
 *
 * @param difficulty - The difficulty level (defaults to 'medium')
 * @returns An unlock task with the math problem
 */
export function generateMathTask(difficulty: TaskDifficulty = "medium"): UnlockTask {
  const id = randomBytes(16).toString("hex");
  let a: number;
  let b: number;
  let operation: MathOperation;
  let result: number;

  switch (difficulty) {
    case "easy": {
      a = randomInt(10, 99);
      b = randomInt(10, 99);
      operation = randomPick<MathOperation>(["+", "-"]);
      if (operation === "+") {
        result = a + b;
      } else {
        // Ensure positive result for subtraction
        if (a < b) {
          [a, b] = [b, a];
        }
        result = a - b;
      }
      break;
    }
    case "medium": {
      a = randomInt(10, 99);
      b = randomInt(10, 99);
      operation = "*";
      result = a * b;
      break;
    }
    case "hard": {
      a = randomInt(100, 999);
      b = randomInt(10, 99);
      operation = "*";
      result = a * b;
      break;
    }
  }

  const operationDisplay = operation === "*" ? "\u00d7" : operation;
  const prompt = `What is ${a} ${operationDisplay} ${b}?`;

  return {
    id,
    type: "math",
    prompt,
    expectedAnswer: String(result),
    createdAt: Date.now(),
  };
}

/**
 * Generate a typing challenge.
 *
 * Before unlocking, the user must accurately type a given text passage.
 * This creates cognitive friction and requires focused attention.
 *
 * Difficulty levels:
 * - easy: Short sentence (10-15 words)
 * - medium: Longer paragraph (25-35 words)
 * - hard: Complex paragraph with punctuation (40-50 words)
 *
 * @param difficulty - The difficulty level (defaults to 'medium')
 * @returns An unlock task with the text to type
 */
export function generateTypingTask(difficulty: TaskDifficulty = "medium"): UnlockTask {
  const id = randomBytes(16).toString("hex");
  const sentences = TYPING_SENTENCES[difficulty];
  const text = randomPick(sentences);

  return {
    id,
    type: "typing",
    prompt: `Type the following text:\n${text}`,
    expectedAnswer: text,
    createdAt: Date.now(),
  };
}

/**
 * Verify an answer against a task.
 *
 * For math tasks: exact match of the numeric answer (trimmed).
 * For typing tasks: exact match (case-sensitive, trimmed).
 *
 * @param task - The task to verify against
 * @param answer - The user's answer
 * @returns `true` if the answer is correct
 */
export function verifyTaskAnswer(task: UnlockTask, answer: string): boolean {
  if (task.type === "math") {
    return answer.trim() === task.expectedAnswer;
  }

  // For typing tasks: exact match, case-sensitive, trimmed
  return answer.trim() === task.expectedAnswer;
}
