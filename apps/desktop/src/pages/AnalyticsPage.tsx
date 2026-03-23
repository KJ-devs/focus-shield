import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heatmap } from "@/components/analytics/Heatmap";
import { TrendChart } from "@/components/analytics/TrendChart";
import { DistractionRadar } from "@/components/analytics/DistractionRadar";
import { DailyTimeline } from "@/components/analytics/DailyTimeline";
import { StreakCounter } from "@/components/analytics/StreakCounter";
import { useGamificationStore } from "@/stores/gamification-store";
import { PeakHours } from "@/components/analytics/PeakHours";
import { Insights } from "@/components/analytics/Insights";
import { KnowledgeAnalytics } from "@/components/knowledge/KnowledgeAnalytics";
import {
  storageGetStatsRange,
  storageGetStreak,
  type DailyStatsRecord,
} from "@/tauri/storage";
import type {
  DayData,
  TimelineEntry,
  TrendPoint,
  DistractionCategory,
  PeakHourPoint,
} from "@/data/mock-analytics";

type Period = "30d" | "90d" | "1y";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const MILESTONES = [7, 30, 100, 365];

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodToDays(period: Period): number {
  switch (period) {
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
  }
}

function statsToYearData(stats: DailyStatsRecord[]): DayData[] {
  const map = new Map<string, number>();
  for (const s of stats) {
    map.set(s.date, s.totalFocusMinutes);
  }

  const data: DayData[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  for (let i = 0; i < 365; i++) {
    const current = new Date(start);
    current.setDate(current.getDate() + i);
    const dateStr = formatDate(current);
    data.push({
      date: dateStr,
      focusMinutes: Math.round(map.get(dateStr) ?? 0),
    });
  }

  return data;
}

function statsToTrendData(stats: DailyStatsRecord[], days: number): TrendPoint[] {
  const map = new Map<string, number>();
  for (const s of stats) {
    map.set(s.date, s.totalFocusMinutes);
  }

  const data: TrendPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const current = new Date(today);
    current.setDate(current.getDate() - i);
    const dateStr = formatDate(current);
    data.push({
      date: dateStr,
      minutes: Math.round(map.get(dateStr) ?? 0),
    });
  }

  return data;
}

function statsToDistractionData(stats: DailyStatsRecord[]): DistractionCategory[] {
  const categoryMap = new Map<string, number>();

  for (const s of stats) {
    try {
      const distractors: { target: string; count: number }[] = JSON.parse(s.topDistractors);
      for (const d of distractors) {
        categoryMap.set(d.target, (categoryMap.get(d.target) ?? 0) + d.count);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  if (categoryMap.size === 0) {
    return [{ category: "None yet", count: 0 }];
  }

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function statsToTimeline(todayStats: DailyStatsRecord | undefined): TimelineEntry[] {
  // Without per-block timestamps, show a simplified timeline
  if (!todayStats || todayStats.totalFocusMinutes === 0) {
    return [{ startHour: 0, endHour: 24, type: "idle" }];
  }

  const focusHours = todayStats.totalFocusMinutes / 60;
  const now = new Date().getHours();
  const focusStart = Math.max(0, now - focusHours);

  return [
    { startHour: 0, endHour: focusStart, type: "idle" },
    { startHour: focusStart, endHour: now, type: "focus" },
    { startHour: now, endHour: 24, type: "idle" },
  ];
}

function statsToPeakHours(_stats: DailyStatsRecord[]): PeakHourPoint[] {
  // Without hourly granularity in the DB, return empty
  return [];
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("30d");
  const [stats, setStats] = useState<DailyStatsRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    const days = periodToDays(period);
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    void storageGetStatsRange(formatDate(start), formatDate(end))
      .then(setStats)
      .catch(() => setStats([]));

    void storageGetStreak()
      .then((s) => {
        setStreak(s);
        setLongestStreak((prev) => Math.max(prev, s));
      })
      .catch(() => {});
  }, [period]);

  // Also load year data for heatmap
  const [yearStats, setYearStats] = useState<DailyStatsRecord[]>([]);
  useEffect(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 364);

    void storageGetStatsRange(formatDate(start), formatDate(end))
      .then(setYearStats)
      .catch(() => setYearStats([]));
  }, []);

  const yearData = useMemo(() => statsToYearData(yearStats), [yearStats]);
  const trendDays: 30 | 90 = period === "30d" ? 30 : 90;
  const trendData = useMemo(() => statsToTrendData(stats, trendDays), [stats, trendDays]);
  const distractionData = useMemo(() => statsToDistractionData(stats), [stats]);
  const peakHoursData = useMemo(() => statsToPeakHours(stats), [stats]);

  const todayStr = formatDate(new Date());
  const todayStats = stats.find((s) => s.date === todayStr);
  const timelineData = useMemo(() => statsToTimeline(todayStats), [todayStats]);

  const totalFocus = stats.reduce((sum, s) => sum + s.totalFocusMinutes, 0);
  const totalSessions = stats.reduce((sum, s) => sum + s.sessionsCompleted + s.sessionsAborted, 0);
  const avgDaily = totalSessions > 0 ? totalFocus / Math.max(stats.length, 1) : 0;

  const prevStats = stats.slice(0, Math.floor(stats.length / 2));
  const prevFocus = prevStats.reduce((sum, s) => sum + s.totalFocusMinutes, 0);
  const currentStats = stats.slice(Math.floor(stats.length / 2));
  const currentFocus = currentStats.reduce((sum, s) => sum + s.totalFocusMinutes, 0);

  const topDistractor = distractionData[0]?.category ?? "None";

  const hasPeakData = peakHoursData.length > 0 && peakHoursData.some((p) => p.minutes > 0);

  // Peak hour from data
  const peak = peakHoursData.reduce(
    (best, entry) => (entry.minutes > best.minutes ? entry : best),
    peakHoursData[0] ?? { hour: 0, minutes: 0 },
  );

  const hasAnyStats = stats.length > 0 && totalFocus > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          {t("analytics.title")}
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

      {!hasAnyStats && (
        <Card className="flex flex-col items-center gap-4 py-12">
          <span className="text-5xl">&#x1F4CA;</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            No analytics yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Start your first session to see analytics here.
          </p>
          <Link to="/launch">
            <Button variant="primary">Start a Session</Button>
          </Link>
        </Card>
      )}

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
            currentStreak={streak}
            longestStreak={longestStreak}
            milestones={MILESTONES}
            freezeAvailable={useGamificationStore.getState().freezeAvailable}
            onUseFreeze={() => void useGamificationStore.getState().useStreakFreeze()}
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
          {hasPeakData ? (
            <PeakHours data={peakHoursData} />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Complete sessions to see your peak hours.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Insights
          </h2>
          <Insights
            weeklyFocusMinutes={Math.round(currentFocus)}
            previousWeekFocusMinutes={Math.round(prevFocus)}
            peakHour={peak.hour}
            topDistractor={topDistractor}
            averageDailyMinutes={Math.round(avgDaily)}
          />
        </Card>
      </div>

      <KnowledgeAnalytics />
    </div>
  );
}
