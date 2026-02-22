export interface ScoreInput {
  plannedFocusMinutes: number;
  actualFocusMinutes: number;
  distractionAttempts: number;
  sessionCompleted: boolean;
}

const TIME_RATIO_WEIGHT = 0.6;
const DISTRACTION_WEIGHT = 0.25;
const COMPLETION_WEIGHT = 0.15;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

/**
 * The distraction penalty curve constant.
 * With 10 distractions, the distraction score drops to ~37%.
 * With 20 distractions, it drops to ~13%.
 */
const DISTRACTION_DECAY_FACTOR = 0.1;

/**
 * Calculate a focus score (0-100) for a session.
 *
 * Score breakdown:
 * - Time ratio (actual vs planned): 60% weight
 * - Distraction resistance (fewer attempts = better): 25% weight
 * - Session completion bonus: 15% weight
 *
 * The score is clamped between 0 and 100.
 */
export function calculateFocusScore(input: ScoreInput): number {
  const timeScore = calculateTimeScore(input.plannedFocusMinutes, input.actualFocusMinutes);
  const distractionScore = calculateDistractionScore(input.distractionAttempts);
  const completionScore = input.sessionCompleted ? MAX_SCORE : MIN_SCORE;

  const rawScore =
    timeScore * TIME_RATIO_WEIGHT +
    distractionScore * DISTRACTION_WEIGHT +
    completionScore * COMPLETION_WEIGHT;

  return clamp(Math.round(rawScore), MIN_SCORE, MAX_SCORE);
}

/**
 * Calculate the time component score.
 * A ratio of 1.0 (actual == planned) yields 100.
 * Ratios above 1.0 are capped at 100 (extra time is not penalized).
 */
function calculateTimeScore(planned: number, actual: number): number {
  if (planned <= 0) {
    return 0;
  }
  const ratio = actual / planned;
  return clamp(ratio * MAX_SCORE, MIN_SCORE, MAX_SCORE);
}

/**
 * Calculate the distraction resistance score using exponential decay.
 * 0 distractions = 100, more distractions = score decays toward 0.
 */
function calculateDistractionScore(attempts: number): number {
  if (attempts <= 0) {
    return MAX_SCORE;
  }
  return MAX_SCORE * Math.exp(-DISTRACTION_DECAY_FACTOR * attempts);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
