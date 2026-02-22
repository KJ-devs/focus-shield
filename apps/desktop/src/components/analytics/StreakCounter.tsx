interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  milestones: number[];
}

function getMilestoneStatus(
  milestone: number,
  currentStreak: number,
): "achieved" | "upcoming" {
  return currentStreak >= milestone ? "achieved" : "upcoming";
}

function getProgressPercent(currentStreak: number, milestones: number[]): number {
  const sorted = [...milestones].sort((a, b) => a - b);

  let prevMilestone = 0;
  for (const milestone of sorted) {
    if (currentStreak < milestone) {
      const range = milestone - prevMilestone;
      const progress = currentStreak - prevMilestone;
      return Math.min(100, (progress / range) * 100);
    }
    prevMilestone = milestone;
  }

  return 100;
}

function getNextMilestone(
  currentStreak: number,
  milestones: number[],
): number | null {
  const sorted = [...milestones].sort((a, b) => a - b);
  return sorted.find((m) => m > currentStreak) ?? null;
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  milestones,
}: StreakCounterProps) {
  const progressPercent = getProgressPercent(currentStreak, milestones);
  const nextMilestone = getNextMilestone(currentStreak, milestones);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-900 dark:text-white">
          {currentStreak}
        </div>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          day streak
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Longest: <span className="font-semibold text-gray-700 dark:text-gray-300">{longestStreak} days</span>
      </div>

      {nextMilestone && (
        <div className="w-full">
          <div className="mb-1 flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{currentStreak} days</span>
            <span>{nextMilestone} days</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-focus-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-between gap-2">
        {milestones.map((milestone) => {
          const status = getMilestoneStatus(milestone, currentStreak);
          return (
            <div key={milestone} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  status === "achieved"
                    ? "bg-focus-500 text-white"
                    : "border-2 border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500"
                }`}
              >
                {status === "achieved" ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {milestone}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
