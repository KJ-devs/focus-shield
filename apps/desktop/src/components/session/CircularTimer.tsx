interface CircularTimerProps {
  timeRemainingMs: number;
  totalDurationMs: number;
  sessionName: string;
  size?: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function CircularTimer({
  timeRemainingMs,
  totalDurationMs,
  sessionName,
  size = 240,
}: CircularTimerProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalDurationMs > 0 ? timeRemainingMs / totalDurationMs : 0;
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  const progressAngle = progress * 360 - 90;
  const progressRad = (progressAngle * Math.PI) / 180;
  const dotX = center + radius * Math.cos(progressRad);
  const dotY = center + radius * Math.sin(progressRad);

  return (
    <div data-testid="circular-timer" className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        className="drop-shadow-lg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700/50"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-focus-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
          transform={`rotate(-90 ${center} ${center})`}
          filter="url(#glow)"
        />
        {/* Progress dot indicator */}
        {progress > 0.01 && (
          <circle
            cx={dotX}
            cy={dotY}
            r={6}
            className="fill-focus-500 animate-pulse"
            filter="url(#glow)"
          />
        )}
        {/* Time text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 dark:fill-white font-mono font-bold"
          style={{ fontSize: size > 240 ? "3rem" : "2rem" }}
        >
          {formatTime(timeRemainingMs)}
        </text>
        {/* Session name */}
        <text
          x={center}
          y={center + 36}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-500 dark:fill-gray-400 font-medium"
          style={{ fontSize: "0.875rem" }}
        >
          {sessionName}
        </text>
      </svg>
    </div>
  );
}
