import { useTranslation } from "react-i18next";
import { useGamificationStore } from "@/stores/gamification-store";
import { ACHIEVEMENT_CATALOG } from "@focus-shield/storage/gamification/achievements";
import type { AchievementProgress } from "@focus-shield/storage/gamification/achievements";
import { Card } from "@/components/ui/Card";

const ACHIEVEMENT_ICONS: Record<string, string> = {
  star: "\u2B50",
  shield: "\uD83D\uDEE1\uFE0F",
  sunrise: "\uD83C\uDF05",
  moon: "\uD83C\uDF19",
  trophy: "\uD83C\uDFC6",
  sparkle: "\u2728",
  rocket: "\uD83D\uDE80",
  hundred: "\uD83D\uDCAF",
  ocean: "\uD83C\uDF0A",
  card: "\uD83C\uDCCF",
  graduation: "\uD83C\uDF93",
  lightning: "\u26A1",
  book: "\uD83D\uDCDA",
  brain: "\uD83E\uDDE0",
  fire: "\uD83D\uDD25",
  diamond: "\uD83D\uDC8E",
};

function getAchievementEmoji(icon: string): string {
  return ACHIEVEMENT_ICONS[icon] ?? "\uD83C\uDFC5";
}

function AchievementCard({
  name,
  description,
  icon,
  maxProgress,
  progress,
}: {
  name: string;
  description: string;
  icon: string;
  maxProgress: number;
  progress: AchievementProgress | undefined;
}) {
  const unlocked = progress?.unlocked ?? false;
  const currentProgress = progress?.currentProgress ?? 0;
  const progressPct = maxProgress > 0 ? Math.min((currentProgress / maxProgress) * 100, 100) : 0;
  const unlockedDate = progress?.unlockedAt
    ? new Date(progress.unlockedAt).toLocaleDateString()
    : null;

  return (
    <Card
      className={`flex items-start gap-4 transition-all ${
        unlocked
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10"
          : "opacity-70"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
          unlocked
            ? "bg-amber-100 dark:bg-amber-900/30"
            : "bg-gray-100 grayscale dark:bg-gray-800"
        }`}
      >
        {getAchievementEmoji(icon)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
          {unlocked && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Unlocked
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        {!unlocked && maxProgress > 1 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{currentProgress} / {maxProgress}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-focus-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
        {unlockedDate && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Unlocked on {unlockedDate}
          </p>
        )}
      </div>
    </Card>
  );
}

export function AchievementsPage() {
  const { t } = useTranslation();
  const achievementProgress = useGamificationStore((s) => s.achievementProgress);
  const levelInfo = useGamificationStore((s) => s.levelInfo);
  const totalXp = useGamificationStore((s) => s.totalXp);

  const progressMap = new Map(
    achievementProgress.map((p) => [p.achievementId, p]),
  );

  const unlockedCount = achievementProgress.filter((p) => p.unlocked).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          {t("achievements.title")}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {unlockedCount} / {ACHIEVEMENT_CATALOG.length} {t("achievements.unlocked").toLowerCase()}
        </p>
      </div>

      {/* Level overview */}
      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-focus-100 text-2xl font-bold text-focus-700 dark:bg-focus-900/30 dark:text-focus-400">
          {levelInfo.level}
        </div>
        <div className="text-center sm:text-left">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {levelInfo.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalXp.toLocaleString()} XP total
          </p>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>Level {levelInfo.level}</span>
            <span>Level {levelInfo.level + 1}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-focus-500 transition-all"
              style={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500">
            {(levelInfo.xpForNextLevel - totalXp).toLocaleString()} XP to next level
          </p>
        </div>
      </Card>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACHIEVEMENT_CATALOG.map((def) => (
          <AchievementCard
            key={def.id}
            name={def.name}
            description={def.description}
            icon={def.icon}
            maxProgress={def.maxProgress}
            progress={progressMap.get(def.id)}
          />
        ))}
      </div>
    </div>
  );
}
