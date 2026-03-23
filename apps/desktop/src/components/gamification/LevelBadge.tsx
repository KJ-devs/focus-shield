import { useGamificationStore } from "@/stores/gamification-store";

export function LevelBadge() {
  const levelInfo = useGamificationStore((s) => s.levelInfo);
  const isLoaded = useGamificationStore((s) => s.isLoaded);

  if (!isLoaded) return null;

  const progressPct = Math.round(levelInfo.progress * 100);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-focus-100 text-sm font-bold text-focus-700 dark:bg-focus-900/30 dark:text-focus-400">
          {levelInfo.level}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
            {levelInfo.title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-focus-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
              {progressPct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
