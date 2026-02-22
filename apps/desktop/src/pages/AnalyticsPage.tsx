import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Heatmap } from "@/components/analytics/Heatmap";
import { TrendChart } from "@/components/analytics/TrendChart";
import { DistractionRadar } from "@/components/analytics/DistractionRadar";
import { DailyTimeline } from "@/components/analytics/DailyTimeline";
import { StreakCounter } from "@/components/analytics/StreakCounter";
import { PeakHours } from "@/components/analytics/PeakHours";
import { Insights } from "@/components/analytics/Insights";
import {
  generateYearData,
  generateTodayTimeline,
  generateTrendData,
  generateDistractionData,
  generatePeakHoursData,
  generateSummary,
} from "@/data/mock-analytics";

type Period = "30d" | "90d" | "1y";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const MILESTONES = [7, 30, 100, 365];

function getTrendDays(period: Period): 30 | 90 {
  return period === "90d" || period === "1y" ? 90 : 30;
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");

  const yearData = useMemo(() => generateYearData(), []);
  const timelineData = useMemo(() => generateTodayTimeline(), []);
  const trendDays = getTrendDays(period);
  const trendData = useMemo(() => generateTrendData(trendDays), [trendDays]);
  const distractionData = useMemo(() => generateDistractionData(), []);
  const peakHoursData = useMemo(() => generatePeakHoursData(), []);
  const summary = useMemo(() => generateSummary(), []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                period === option.value
                  ? "bg-focus-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Focus Activity
        </h2>
        <Heatmap data={yearData} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Focus Trend ({trendDays} days)
          </h2>
          <TrendChart data={trendData} days={trendDays} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Streak
          </h2>
          <StreakCounter
            currentStreak={summary.currentStreak}
            longestStreak={summary.longestStreak}
            milestones={MILESTONES}
          />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Today&apos;s Timeline
        </h2>
        <DailyTimeline entries={timelineData} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Distractions
          </h2>
          <DistractionRadar data={distractionData} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Peak Hours
          </h2>
          <PeakHours data={peakHoursData} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Insights
          </h2>
          <Insights
            weeklyFocusMinutes={summary.weeklyFocusMinutes}
            previousWeekFocusMinutes={summary.previousWeekFocusMinutes}
            peakHour={summary.peakHour}
            topDistractor={summary.topDistractor}
            averageDailyMinutes={summary.averageDailyMinutes}
          />
        </Card>
      </div>
    </div>
  );
}
