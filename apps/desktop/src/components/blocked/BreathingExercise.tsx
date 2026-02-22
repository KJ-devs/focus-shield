import { useState, useEffect, useCallback, useRef } from "react";

type BreathPhase = "inhale" | "hold-in" | "exhale" | "hold-out";

interface PhaseConfig {
  label: string;
  durationMs: number;
}

const PHASE_SEQUENCE: { phase: BreathPhase; config: PhaseConfig }[] = [
  { phase: "inhale", config: { label: "Breathe in...", durationMs: 4000 } },
  { phase: "hold-in", config: { label: "Hold...", durationMs: 4000 } },
  { phase: "exhale", config: { label: "Breathe out...", durationMs: 4000 } },
  { phase: "hold-out", config: { label: "Hold...", durationMs: 2000 } },
];

const TOTAL_CYCLE_MS = PHASE_SEQUENCE.reduce(
  (sum, p) => sum + p.config.durationMs,
  0,
);

const EXERCISE_DURATION_MS = 30_000;

interface BreathingExerciseProps {
  onComplete: () => void;
}

function getScaleForPhase(phase: BreathPhase, progress: number): number {
  switch (phase) {
    case "inhale":
      return 0.5 + 0.5 * progress;
    case "hold-in":
      return 1.0;
    case "exhale":
      return 1.0 - 0.5 * progress;
    case "hold-out":
      return 0.5;
  }
}

export function BreathingExercise({ onComplete }: BreathingExerciseProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathPhase>("inhale");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const startTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  const updateBreathing = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    setElapsedMs(elapsed);

    if (elapsed >= EXERCISE_DURATION_MS) {
      setIsCompleted(true);
      return;
    }

    const cyclePosition = elapsed % TOTAL_CYCLE_MS;

    let accumulated = 0;
    for (const entry of PHASE_SEQUENCE) {
      accumulated += entry.config.durationMs;
      if (cyclePosition < accumulated) {
        const phaseStart = accumulated - entry.config.durationMs;
        const phaseElapsed = cyclePosition - phaseStart;
        const progress = phaseElapsed / entry.config.durationMs;

        setCurrentPhase(entry.phase);
        setPhaseProgress(progress);
        break;
      }
    }

    frameRef.current = requestAnimationFrame(updateBreathing);
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    frameRef.current = requestAnimationFrame(updateBreathing);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [updateBreathing]);

  useEffect(() => {
    if (isCompleted) {
      onComplete();
    }
  }, [isCompleted, onComplete]);

  const scale = getScaleForPhase(currentPhase, phaseProgress);
  const secondsRemaining = Math.max(
    0,
    Math.ceil((EXERCISE_DURATION_MS - elapsedMs) / 1000),
  );

  const currentLabel =
    PHASE_SEQUENCE.find((entry) => entry.phase === currentPhase)?.config
      .label ?? "";

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Take a moment to breathe
      </p>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {/* Outer ring */}
        <div
          className="absolute rounded-full border-2 border-blue-200 dark:border-blue-800 transition-transform duration-300 ease-in-out"
          style={{
            width: 200,
            height: 200,
            transform: `scale(${scale})`,
          }}
        />
        {/* Inner circle */}
        <div
          className="absolute rounded-full bg-blue-400/20 dark:bg-blue-500/20 transition-transform duration-300 ease-in-out"
          style={{
            width: 160,
            height: 160,
            transform: `scale(${scale})`,
          }}
        />
        {/* Core circle */}
        <div
          className="absolute rounded-full bg-blue-500/30 dark:bg-blue-400/30 transition-transform duration-300 ease-in-out"
          style={{
            width: 120,
            height: 120,
            transform: `scale(${scale})`,
          }}
        />

        {/* Phase label */}
        <span className="relative z-10 text-lg font-medium text-blue-700 dark:text-blue-300">
          {currentLabel}
        </span>
      </div>

      {/* Timer */}
      <p className="text-sm text-gray-400 dark:text-gray-500">
        {secondsRemaining}s remaining
      </p>
    </div>
  );
}
