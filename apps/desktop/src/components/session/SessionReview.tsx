import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionReview as SessionReviewData } from "@/stores/session-store";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getRandomQuote } from "@/data/quotes";

interface SessionReviewProps {
  review: SessionReviewData;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}min`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500 dark:text-green-400";
  if (score >= 60) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 dark:bg-green-900/20";
  if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

/**
 * Calculates mock XP based on session performance.
 * Formula: base XP for duration + bonus for focus score + penalty for distractions.
 */
function calculateXpGained(review: SessionReviewData): number {
  const durationMinutes = Math.round(review.actualFocusMs / 60_000);
  const baseXp = durationMinutes * 2;
  const scoreBonus = Math.round((review.focusScore / 100) * baseXp * 0.5);
  const distractionPenalty = review.distractionCount * 3;
  return Math.max(5, baseXp + scoreBonus - distractionPenalty);
}

function getPerformanceMessage(score: number, completedNormally: boolean): string {
  if (!completedNormally) {
    return "Not every session goes as planned. What matters is showing up again.";
  }
  if (score >= 90) return "Outstanding focus! You were in the zone.";
  if (score >= 80) return "Great work! Your concentration was solid.";
  if (score >= 60) return "Good session. Keep building your focus muscles.";
  return "Every session counts. Try to minimize distractions next time.";
}

// ---------------------------------------------------------------------------
// Animated XP Counter
// ---------------------------------------------------------------------------

function AnimatedXpCounter({ target }: { target: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (target <= 0) return;

    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = Math.min(target, Math.round(increment * step));
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(interval);
        setDisplayValue(target);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [target]);

  return (
    <span className="text-2xl font-bold text-focus-600 dark:text-focus-400">
      +{displayValue} XP
    </span>
  );
}

// ---------------------------------------------------------------------------
// Level Progress Bar
// ---------------------------------------------------------------------------

interface LevelProgressProps {
  currentXp: number;
  xpToNextLevel: number;
  level: number;
}

function LevelProgress({ currentXp, xpToNextLevel, level }: LevelProgressProps) {
  const progress = xpToNextLevel > 0 ? (currentXp / xpToNextLevel) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex w-full flex-col gap-1 px-4">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Level {level}</span>
        <span>Level {level + 1}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-focus-500 transition-all duration-1000 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        {currentXp} / {xpToNextLevel} XP
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achievement Notification
// ---------------------------------------------------------------------------

interface MockAchievement {
  name: string;
  description: string;
}

function getNewAchievements(review: SessionReviewData): MockAchievement[] {
  const achievements: MockAchievement[] = [];

  if (review.focusScore === 100 && review.distractionCount === 0) {
    achievements.push({
      name: "Zero Temptation",
      description: "Completed a session with no distraction attempts",
    });
  }

  const durationMinutes = Math.round(review.actualFocusMs / 60_000);
  if (durationMinutes >= 180 && review.completedNormally) {
    achievements.push({
      name: "Marathon",
      description: "Completed a 3-hour session without interruption",
    });
  }

  return achievements;
}

function AchievementNotification({ achievement }: { achievement: MockAchievement }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-900/20">
      <span className="text-2xl">&#x1F3C6;</span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
          Achievement Unlocked!
        </span>
        <span className="text-sm text-yellow-700 dark:text-yellow-400">
          {achievement.name} &mdash; {achievement.description}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/** Mock gamification state (will be replaced by a real gamification store). */
const MOCK_GAMIFICATION = {
  level: 4,
  currentXp: 320,
  xpToNextLevel: 500,
  currentStreak: 5,
};

export function SessionReview({ review, onDismiss }: SessionReviewProps) {
  const navigate = useNavigate();
  const startConfiguring = useSessionStore((s) => s.startConfiguring);
  const [quote] = useState(() => getRandomQuote());

  const xpGained = calculateXpGained(review);
  const achievements = getNewAchievements(review);
  const performanceMessage = getPerformanceMessage(
    review.focusScore,
    review.completedNormally,
  );

  const handleStartAnother = () => {
    onDismiss();
    startConfiguring();
    navigate("/launch");
  };

  const handleGoToDashboard = () => {
    onDismiss();
    navigate("/");
  };

  return (
    <div data-testid="session-review" className="mx-auto w-full max-w-lg">
      <Card className="flex flex-col items-center gap-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Session Complete
        </h2>

        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {review.sessionName}
        </p>

        {/* Focus score */}
        <div
          className={`flex flex-col items-center gap-1 rounded-2xl px-8 py-4 ${getScoreBg(review.focusScore)}`}
        >
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Focus Score
          </span>
          <span
            data-testid="focus-score"
            className={`text-5xl font-bold ${getScoreColor(review.focusScore)}`}
          >
            {review.focusScore}
          </span>
        </div>

        {/* Status badge */}
        <Badge variant={review.completedNormally ? "success" : "warning"}>
          {review.completedNormally ? "Completed" : "Stopped early"}
        </Badge>

        {/* XP gained */}
        <div className="flex flex-col items-center gap-1">
          <AnimatedXpCounter target={xpGained} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            experience earned
          </span>
        </div>

        {/* Level progress */}
        <LevelProgress
          currentXp={MOCK_GAMIFICATION.currentXp + xpGained}
          xpToNextLevel={MOCK_GAMIFICATION.xpToNextLevel}
          level={MOCK_GAMIFICATION.level}
        />

        {/* Streak */}
        <div className="flex items-center gap-2">
          <span className="text-xl">&#x1F525;</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {MOCK_GAMIFICATION.currentStreak}-day streak
          </span>
        </div>

        {/* Achievement notifications */}
        {achievements.map((achievement) => (
          <AchievementNotification
            key={achievement.name}
            achievement={achievement}
          />
        ))}

        {/* Stats grid */}
        <div className="grid w-full grid-cols-2 gap-4 px-4">
          <div className="flex flex-col items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Duration
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(review.actualFocusMs)}
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Planned
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(review.totalDurationMs)}
            </span>
          </div>
          <div className="col-span-2 flex flex-col items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Distractions Blocked
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {review.distractionCount}
            </span>
          </div>
        </div>

        {/* Performance message */}
        <p className="max-w-sm text-center text-sm italic text-gray-500 dark:text-gray-400">
          {performanceMessage}
        </p>

        {/* Motivational quote */}
        <div className="max-w-sm text-center">
          <p className="text-xs italic text-gray-400 dark:text-gray-500">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            &mdash; {quote.author}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button data-testid="start-another-btn" variant="primary" size="lg" onClick={handleStartAnother}>
            Start Another Session
          </Button>
          <Button data-testid="go-to-dashboard-btn" variant="secondary" size="lg" onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
