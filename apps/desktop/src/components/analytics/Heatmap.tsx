import { useState, useMemo } from "react";
import type { DayData } from "@/data/mock-analytics";

interface HeatmapProps {
  data: DayData[];
}

interface TooltipInfo {
  date: string;
  minutes: number;
  x: number;
  y: number;
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function getIntensityClass(minutes: number): string {
  if (minutes === 0) return "bg-gray-100 dark:bg-gray-800";
  if (minutes <= 60) return "bg-focus-100 dark:bg-focus-900";
  if (minutes <= 120) return "bg-focus-300 dark:bg-focus-700";
  if (minutes <= 180) return "bg-focus-500";
  return "bg-focus-700 dark:bg-focus-400";
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return "No focus";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface WeekColumn {
  weekIndex: number;
  days: (DayData | null)[];
  monthStart: string | null;
}

export function Heatmap({ data }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const weeks = useMemo(() => {
    if (data.length === 0) return [];

    const firstEntry = data[0];
    if (!firstEntry) return [];
    const firstDate = new Date(firstEntry.date + "T00:00:00");
    const firstDayOfWeek = firstDate.getDay();

    const columns: WeekColumn[] = [];
    let currentWeek: (DayData | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    let lastMonth = -1;

    for (const day of data) {
      const date = new Date(day.date + "T00:00:00");
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        const weekIndex = columns.length;
        const firstNonNull = currentWeek.find((d) => d !== null);
        let monthStart: string | null = null;

        if (firstNonNull) {
          const monthNum = new Date(
            firstNonNull.date + "T00:00:00",
          ).getMonth();
          if (monthNum !== lastMonth) {
            monthStart = MONTH_NAMES[monthNum] ?? "";
            lastMonth = monthNum;
          }
        }

        columns.push({ weekIndex, days: currentWeek, monthStart });
        currentWeek = [];
      }

      currentWeek.push(day);
    }

    if (currentWeek.length > 0) {
      const weekIndex = columns.length;
      const firstNonNull = currentWeek.find((d) => d !== null);
      let monthStart: string | null = null;

      if (firstNonNull) {
        const monthNum = new Date(firstNonNull.date + "T00:00:00").getMonth();
        if (monthNum !== lastMonth) {
          monthStart = MONTH_NAMES[monthNum] ?? "";
        }
      }

      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }

      columns.push({ weekIndex, days: currentWeek, monthStart });
    }

    return columns;
  }, [data]);

  function handleMouseEnter(
    day: DayData,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.closest("[data-heatmap]");
    const containerRect = container?.getBoundingClientRect();
    if (!containerRect) return;

    setTooltip({
      date: day.date,
      minutes: day.focusMinutes,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <div className="relative" data-heatmap>
      <div className="flex gap-1 overflow-x-auto pb-2">
        <div className="flex flex-col gap-1 pt-5 pr-2">
          {DAY_LABELS.map((label, i) => (
            <div
              key={`day-label-${i}`}
              className="h-3 text-[10px] leading-3 text-gray-400 dark:text-gray-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {weeks.map((week) => (
            <div key={`week-${week.weekIndex}`} className="flex flex-col">
              <div className="h-4 text-[10px] leading-4 text-gray-400 dark:text-gray-500">
                {week.monthStart ?? ""}
              </div>
              <div className="flex flex-col gap-[3px]">
                {week.days.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${week.weekIndex}-${dayIndex}`}
                        className="h-3 w-3"
                      />
                    );
                  }
                  return (
                    <div
                      key={day.date}
                      className={`h-3 w-3 rounded-sm ${getIntensityClass(day.focusMinutes)} cursor-pointer transition-transform hover:scale-125`}
                      onMouseEnter={(e) => handleMouseEnter(day, e)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded bg-gray-900 px-2 py-1 text-xs text-white shadow dark:bg-gray-700"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-medium">{formatDateDisplay(tooltip.date)}</div>
          <div>{formatMinutes(tooltip.minutes)}</div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-gray-400 dark:text-gray-500">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-3 rounded-sm bg-focus-100 dark:bg-focus-900" />
        <div className="h-3 w-3 rounded-sm bg-focus-300 dark:bg-focus-700" />
        <div className="h-3 w-3 rounded-sm bg-focus-500" />
        <div className="h-3 w-3 rounded-sm bg-focus-700 dark:bg-focus-400" />
        <span>More</span>
      </div>
    </div>
  );
}
