import {
  generateMathTask,
  generateTypingTask,
  verifyTaskAnswer,
} from "../task-unlock";
import type { TaskDifficulty } from "../task-unlock";

describe("generateMathTask", () => {
  it("returns a valid task with correct answer", () => {
    const task = generateMathTask("easy");

    expect(task.id).toBeDefined();
    expect(task.id).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(task.type).toBe("math");
    expect(task.prompt).toBeDefined();
    expect(task.expectedAnswer).toBeDefined();
    expect(task.createdAt).toBeGreaterThan(0);

    // The expected answer should be a valid number string
    expect(Number.isFinite(Number(task.expectedAnswer))).toBe(true);
  });

  it("easy difficulty uses addition or subtraction of 2-digit numbers", () => {
    // Run multiple times to check patterns
    for (let i = 0; i < 20; i++) {
      const task = generateMathTask("easy");
      // Should contain either + or - (displayed as-is for these ops)
      const hasAddition = task.prompt.includes("+");
      const hasSubtraction = task.prompt.includes("-");
      // Only one of the two should be present (exclusive to easy)
      // The multiplication sign (x) should NOT be present
      expect(task.prompt.includes("\u00d7")).toBe(false);
      expect(hasAddition || hasSubtraction).toBe(true);

      // The result for subtraction should be non-negative
      const answer = Number(task.expectedAnswer);
      expect(answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("medium difficulty uses multiplication of 2-digit numbers", () => {
    for (let i = 0; i < 10; i++) {
      const task = generateMathTask("medium");
      // Should contain multiplication sign
      expect(task.prompt).toContain("\u00d7");
      // Should NOT contain + or - operators
      expect(task.prompt.includes(" + ")).toBe(false);
      expect(task.prompt.includes(" - ")).toBe(false);

      // Parse numbers from prompt like "What is 23 x 47?"
      const match = task.prompt.match(/(\d+)\s+\u00d7\s+(\d+)/);
      expect(match).not.toBeNull();
      if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        // Both should be 2-digit numbers (10-99)
        expect(a).toBeGreaterThanOrEqual(10);
        expect(a).toBeLessThanOrEqual(99);
        expect(b).toBeGreaterThanOrEqual(10);
        expect(b).toBeLessThanOrEqual(99);
        // Verify the expected answer
        expect(Number(task.expectedAnswer)).toBe(a * b);
      }
    }
  });

  it("hard difficulty uses multiplication of 3-digit by 2-digit numbers", () => {
    for (let i = 0; i < 10; i++) {
      const task = generateMathTask("hard");
      expect(task.prompt).toContain("\u00d7");

      const match = task.prompt.match(/(\d+)\s+\u00d7\s+(\d+)/);
      expect(match).not.toBeNull();
      if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        // One should be 3-digit (100-999), other should be 2-digit (10-99)
        expect(a).toBeGreaterThanOrEqual(100);
        expect(a).toBeLessThanOrEqual(999);
        expect(b).toBeGreaterThanOrEqual(10);
        expect(b).toBeLessThanOrEqual(99);
        expect(Number(task.expectedAnswer)).toBe(a * b);
      }
    }
  });

  it("defaults to medium difficulty when no argument provided", () => {
    const task = generateMathTask();
    // Medium difficulty uses multiplication
    expect(task.prompt).toContain("\u00d7");
  });

  it("different difficulties produce different complexity", () => {
    // Generate multiple tasks and compare typical answer magnitudes
    const easyAnswers: number[] = [];
    const hardAnswers: number[] = [];

    for (let i = 0; i < 20; i++) {
      easyAnswers.push(Number(generateMathTask("easy").expectedAnswer));
      hardAnswers.push(Number(generateMathTask("hard").expectedAnswer));
    }

    const avgEasy =
      easyAnswers.reduce((sum, val) => sum + Math.abs(val), 0) / easyAnswers.length;
    const avgHard =
      hardAnswers.reduce((sum, val) => sum + val, 0) / hardAnswers.length;

    // Hard tasks should have significantly larger answers than easy tasks
    expect(avgHard).toBeGreaterThan(avgEasy);
  });
});

describe("generateTypingTask", () => {
  it("returns a typing task with prompt and expected answer", () => {
    const task = generateTypingTask("easy");

    expect(task.id).toBeDefined();
    expect(task.id).toHaveLength(32);
    expect(task.type).toBe("typing");
    expect(task.prompt).toContain("Type the following text:");
    expect(task.expectedAnswer.length).toBeGreaterThan(0);
    expect(task.createdAt).toBeGreaterThan(0);
  });

  it("prompt contains the expected answer text", () => {
    const task = generateTypingTask("medium");
    expect(task.prompt).toContain(task.expectedAnswer);
  });

  it("defaults to medium difficulty", () => {
    const task = generateTypingTask();
    // Medium sentences are 25-35 words, so expected answer should be longish
    const wordCount = task.expectedAnswer.split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(15);
  });

  it("easy tasks have shorter text than hard tasks", () => {
    // This might be probabilistic but the sentence pools are fixed
    const easyTask = generateTypingTask("easy");
    const hardTask = generateTypingTask("hard");

    expect(hardTask.expectedAnswer.length).toBeGreaterThan(
      easyTask.expectedAnswer.length,
    );
  });

  it("generates different tasks on consecutive calls (randomness)", () => {
    const tasks = new Set<string>();
    // Generate several tasks and expect variety from the sentence pool
    for (let i = 0; i < 20; i++) {
      tasks.add(generateTypingTask("easy").expectedAnswer);
    }
    // With 8 easy sentences and 20 picks, we should see at least 2 different ones
    expect(tasks.size).toBeGreaterThanOrEqual(2);
  });
});

describe("verifyTaskAnswer", () => {
  it("returns true for correct math answer", () => {
    const task = generateMathTask("easy");
    expect(verifyTaskAnswer(task, task.expectedAnswer)).toBe(true);
  });

  it("returns false for wrong math answer", () => {
    const task = generateMathTask("easy");
    expect(verifyTaskAnswer(task, "999999")).toBe(false);
  });

  it("trims whitespace from the answer for math tasks", () => {
    const task = generateMathTask("easy");
    expect(verifyTaskAnswer(task, `  ${task.expectedAnswer}  `)).toBe(true);
  });

  it("returns true for correct typing answer", () => {
    const task = generateTypingTask("easy");
    expect(verifyTaskAnswer(task, task.expectedAnswer)).toBe(true);
  });

  it("returns false for wrong typing answer", () => {
    const task = generateTypingTask("easy");
    expect(verifyTaskAnswer(task, "completely wrong text")).toBe(false);
  });

  it("typing answer is case-sensitive", () => {
    const task = generateTypingTask("easy");
    const flippedCase = task.expectedAnswer
      .split("")
      .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
      .join("");

    // If the case is flipped, it should not match
    if (flippedCase !== task.expectedAnswer) {
      expect(verifyTaskAnswer(task, flippedCase)).toBe(false);
    }
  });

  it("trims whitespace from the answer for typing tasks", () => {
    const task = generateTypingTask("easy");
    expect(verifyTaskAnswer(task, `  ${task.expectedAnswer}  `)).toBe(true);
  });

  it("returns false for empty answer", () => {
    const task = generateMathTask("easy");
    expect(verifyTaskAnswer(task, "")).toBe(false);
  });
});

describe("difficulty produces different complexity", () => {
  const difficulties: TaskDifficulty[] = ["easy", "medium", "hard"];

  it("all difficulty levels generate valid math tasks", () => {
    for (const difficulty of difficulties) {
      const task = generateMathTask(difficulty);
      expect(task.type).toBe("math");
      expect(task.prompt).toBeTruthy();
      expect(task.expectedAnswer).toBeTruthy();
      expect(verifyTaskAnswer(task, task.expectedAnswer)).toBe(true);
    }
  });

  it("all difficulty levels generate valid typing tasks", () => {
    for (const difficulty of difficulties) {
      const task = generateTypingTask(difficulty);
      expect(task.type).toBe("typing");
      expect(task.prompt).toBeTruthy();
      expect(task.expectedAnswer).toBeTruthy();
      expect(verifyTaskAnswer(task, task.expectedAnswer)).toBe(true);
    }
  });
});
