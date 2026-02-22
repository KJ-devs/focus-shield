export interface DayData {
  date: string;
  focusMinutes: number;
}

export interface TimelineEntry {
  startHour: number;
  endHour: number;
  type: "focus" | "break" | "idle";
}

export interface DistractionCategory {
  category: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  minutes: number;
}

export interface PeakHourPoint {
  hour: number;
  minutes: number;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateYearData(): DayData[] {
  const rand = seededRandom(42);
  const data: DayData[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  for (let i = 0; i < 365; i++) {
    const current = new Date(start);
    current.setDate(current.getDate() + i);
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let focusMinutes: number;
    const roll = rand();

    if (roll < 0.1) {
      focusMinutes = 0;
    } else if (isWeekend) {
      focusMinutes = Math.floor(rand() * 90);
    } else if (roll < 0.3) {
      focusMinutes = Math.floor(30 + rand() * 60);
    } else if (roll < 0.7) {
      focusMinutes = Math.floor(90 + rand() * 90);
    } else if (roll < 0.9) {
      focusMinutes = Math.floor(150 + rand() * 60);
    } else {
      focusMinutes = Math.floor(210 + rand() * 90);
    }

    data.push({ date: formatDate(current), focusMinutes });
  }

  return data;
}

export function generateTodayTimeline(): TimelineEntry[] {
  return [
    { startHour: 0, endHour: 7, type: "idle" },
    { startHour: 7, endHour: 7.5, type: "break" },
    { startHour: 7.5, endHour: 9, type: "focus" },
    { startHour: 9, endHour: 9.25, type: "break" },
    { startHour: 9.25, endHour: 11, type: "focus" },
    { startHour: 11, endHour: 11.5, type: "break" },
    { startHour: 11.5, endHour: 12, type: "focus" },
    { startHour: 12, endHour: 13, type: "idle" },
    { startHour: 13, endHour: 14.5, type: "focus" },
    { startHour: 14.5, endHour: 15, type: "break" },
    { startHour: 15, endHour: 17, type: "focus" },
    { startHour: 17, endHour: 24, type: "idle" },
  ];
}

export function generateTrendData(days: number): TrendPoint[] {
  const rand = seededRandom(123);
  const data: TrendPoint[] = [];
  const today = new Date();

  let baseline = 120;

  for (let i = days - 1; i >= 0; i--) {
    const current = new Date(today);
    current.setDate(current.getDate() - i);
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    baseline += (rand() - 0.48) * 20;
    baseline = Math.max(30, Math.min(300, baseline));

    const variance = (rand() - 0.5) * 60;
    const weekendPenalty = isWeekend ? -40 : 0;
    const minutes = Math.max(0, Math.floor(baseline + variance + weekendPenalty));

    data.push({ date: formatDate(current), minutes });
  }

  return data;
}

export function generateDistractionData(): DistractionCategory[] {
  return [
    { category: "Social", count: 47 },
    { category: "Entertainment", count: 32 },
    { category: "Gaming", count: 12 },
    { category: "News", count: 28 },
    { category: "Shopping", count: 8 },
  ];
}

export function generatePeakHoursData(): PeakHourPoint[] {
  const rand = seededRandom(99);
  const data: PeakHourPoint[] = [];

  for (let hour = 0; hour < 24; hour++) {
    let base: number;
    if (hour >= 0 && hour < 6) {
      base = 0;
    } else if (hour >= 6 && hour < 8) {
      base = 10 + (hour - 6) * 15;
    } else if (hour >= 8 && hour < 12) {
      base = 40 + (hour === 9 || hour === 10 ? 15 : 0);
    } else if (hour >= 12 && hour < 14) {
      base = 15;
    } else if (hour >= 14 && hour < 18) {
      base = 35 + (hour === 15 || hour === 16 ? 10 : 0);
    } else {
      base = Math.max(0, 20 - (hour - 18) * 5);
    }

    const variance = Math.floor(rand() * 10);
    data.push({ hour, minutes: Math.max(0, base + variance) });
  }

  return data;
}

export interface AnalyticsSummary {
  weeklyFocusMinutes: number;
  previousWeekFocusMinutes: number;
  peakHour: number;
  topDistractor: string;
  averageDailyMinutes: number;
  currentStreak: number;
  longestStreak: number;
}

export function generateSummary(): AnalyticsSummary {
  const peakHours = generatePeakHoursData();
  const firstPeak = peakHours[0] ?? { hour: 0, minutes: 0 };
  const peak = peakHours.reduce(
    (best, entry) => (entry.minutes > best.minutes ? entry : best),
    firstPeak,
  );

  const distractions = generateDistractionData();
  const firstDistraction = distractions[0] ?? { category: "Unknown", count: 0 };
  const topDistractor = distractions.reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    firstDistraction,
  );

  return {
    weeklyFocusMinutes: 1260,
    previousWeekFocusMinutes: 1050,
    peakHour: peak.hour,
    topDistractor: topDistractor.category,
    averageDailyMinutes: 156,
    currentStreak: 12,
    longestStreak: 34,
  };
}
