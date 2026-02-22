import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useMemo } from "react";
import type { PeakHourPoint } from "@/data/mock-analytics";

interface PeakHoursProps {
  data: PeakHourPoint[];
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

interface TooltipPayloadEntry {
  value: number;
  payload: PeakHourPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  if (!entry) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {formatHourLabel(entry.payload.hour)}
      </p>
      <p className="text-sm text-focus-600 dark:text-focus-400">
        {entry.value} min avg
      </p>
    </div>
  );
}

const PEAK_COLOR = "#2563eb";
const NORMAL_COLOR = "#3b82f6";

export function PeakHours({ data }: PeakHoursProps) {
  const peakHour = useMemo(() => {
    const first = data[0];
    if (!first) return 0;
    return data.reduce(
      (best, entry) => (entry.minutes > best.minutes ? entry : best),
      first,
    ).hour;
  }, [data]);

  const tickValues = [0, 6, 12, 18];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="hour"
            tickFormatter={formatHourLabel}
            ticks={tickValues}
            tick={{ fontSize: 11 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={(v: number) => `${v}m`}
            tick={{ fontSize: 11 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="minutes" radius={[2, 2, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={`cell-${entry.hour}`}
                fill={entry.hour === peakHour ? PEAK_COLOR : NORMAL_COLOR}
                fillOpacity={entry.hour === peakHour ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
