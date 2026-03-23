import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { knowledgeGetStats, knowledgeListFolders } from "@/tauri/knowledge";
import type { KnowledgeStats } from "@/tauri/knowledge";

interface AggregatedStats {
  totalCards: number;
  dueCards: number;
  masteredCards: number;
  totalReviews: number;
  successRate: number;
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? "text-gray-900 dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function SuccessRateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80
      ? "bg-green-500"
      : rate >= 50
        ? "bg-orange-500"
        : "bg-red-500";

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>0%</span>
        <span>{Math.round(rate)}%</span>
        <span>100%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function KnowledgeAnalytics() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const folders = await knowledgeListFolders();
        if (folders.length === 0) {
          setStats({ totalCards: 0, dueCards: 0, masteredCards: 0, totalReviews: 0, successRate: 0 });
          return;
        }

        const allStats = await Promise.all(
          folders.map((f) => knowledgeGetStats(f.id).catch((): KnowledgeStats => ({
            totalCards: 0,
            dueCards: 0,
            masteredCards: 0,
            totalReviews: 0,
            successRate: 0,
          }))),
        );

        const aggregated: AggregatedStats = {
          totalCards: allStats.reduce((s, st) => s + st.totalCards, 0),
          dueCards: allStats.reduce((s, st) => s + st.dueCards, 0),
          masteredCards: allStats.reduce((s, st) => s + st.masteredCards, 0),
          totalReviews: allStats.reduce((s, st) => s + st.totalReviews, 0),
          successRate: 0,
        };

        if (aggregated.totalReviews > 0) {
          const weightedRate = allStats.reduce(
            (s, st) => s + st.successRate * st.totalReviews,
            0,
          );
          aggregated.successRate = weightedRate / aggregated.totalReviews;
        }

        setStats(aggregated);
      } catch {
        setStats({ totalCards: 0, dueCards: 0, masteredCards: 0, totalReviews: 0, successRate: 0 });
      } finally {
        setIsLoading(false);
      }
    }

    void loadStats();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t("analytics.knowledge.title")}
        </h2>
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("common.loading")}</p>
        </div>
      </Card>
    );
  }

  if (!stats || stats.totalCards === 0) {
    return (
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t("analytics.knowledge.title")}
        </h2>
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("analytics.knowledge.noData")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        {t("analytics.knowledge.title")}
      </h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <StatBlock
          label={t("analytics.knowledge.totalCards")}
          value={String(stats.totalCards)}
        />
        <StatBlock
          label={t("analytics.knowledge.dueCards")}
          value={String(stats.dueCards)}
          color={stats.dueCards > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}
        />
        <StatBlock
          label={t("analytics.knowledge.mastered")}
          value={String(stats.masteredCards)}
          color="text-green-600 dark:text-green-400"
        />
        <StatBlock
          label={t("analytics.knowledge.totalReviews")}
          value={String(stats.totalReviews)}
        />
      </div>
      <div className="mt-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("analytics.knowledge.successRate")}
        </p>
        <SuccessRateBar rate={stats.successRate} />
      </div>
    </Card>
  );
}
