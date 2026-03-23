import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDailyChallenges } from "@/data/daily-challenges";
import { Card } from "@/components/ui/Card";

export function DailyChallenges() {
  const { t } = useTranslation();
  const challenges = useMemo(() => getDailyChallenges(), []);
  const [completedIds] = useState<Set<string>>(new Set());

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        {t("home.dailyChallenges")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {challenges.map((challenge) => {
          const done = completedIds.has(challenge.id);
          return (
            <Card
              key={challenge.id}
              className={`flex items-start gap-3 ${
                done
                  ? "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10"
                  : ""
              }`}
            >
              <span className="text-xl">{challenge.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {challenge.title}
                  </h3>
                  {done && (
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {challenge.description}
                </p>
                <span className="mt-1 inline-block text-xs font-medium text-focus-600 dark:text-focus-400">
                  +{challenge.xpBonus} XP
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
