import type { Flashcard, ReviewRating, ReviewResult } from "./types";

type SM2Input = Pick<Flashcard, "ease" | "interval" | "repetitions">;

const MIN_EASE = 1.3;

export function reviewCard(card: SM2Input, rating: ReviewRating): ReviewResult {
  const now = new Date();
  let { ease, interval, repetitions } = card;

  switch (rating) {
    case "again": {
      repetitions = 0;
      interval = 1;
      ease = Math.max(MIN_EASE, ease - 0.2);
      break;
    }
    case "hard": {
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(MIN_EASE, ease - 0.15);
      break;
    }
    case "good": {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
      repetitions += 1;
      break;
    }
    case "easy": {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease * 1.3);
      }
      ease += 0.15;
      repetitions += 1;
      break;
    }
  }

  const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return { ease, interval, repetitions, nextReviewAt };
}

export function createNewCard(): Pick<
  Flashcard,
  "ease" | "interval" | "repetitions"
> {
  return { ease: 2.5, interval: 0, repetitions: 0 };
}

export function isDue(card: Pick<Flashcard, "nextReviewAt">): boolean {
  return card.nextReviewAt <= new Date();
}
