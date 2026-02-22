import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 18) return "Good afternoon!";
  return "Good evening!";
}

function formatMinutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatMsToTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

interface QuickPreset {
  name: string;
  durationMinutes: number;
  icon: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { name: "Pomodoro", durationMinutes: 25, icon: "\uD83C\uDF45" },
  { name: "Deep Work", durationMinutes: 90, icon: "\uD83E\uDDE0" },
  { name: "Quick Focus", durationMinutes: 15, icon: "\u26A1" },
];

interface RecentSession {
  name: string;
  duration: string;
  status: "completed" | "aborted";
}

const RECENT_SESSIONS: RecentSession[] = [
  { name: "Pomodoro", duration: "25 min", status: "completed" },
  { name: "Deep Work", duration: "90 min", status: "completed" },
  { name: "Quick Focus", duration: "15 min", status: "aborted" },
  { name: "Pomodoro", duration: "25 min", status: "completed" },
];

function QuickStartSection() {
  const startQuickSession = useSessionStore((s) => s.startQuickSession);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Quick Start
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_PRESETS.map((preset) => (
          <Card key={preset.name} className="flex flex-col items-center gap-3">
            <span className="text-3xl">{preset.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {preset.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {preset.durationMinutes} min
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                startQuickSession(
                  preset.name,
                  preset.durationMinutes * 60 * 1000,
                )
              }
            >
              Start
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActiveSessionSection() {
  const currentSessionName = useSessionStore((s) => s.currentSessionName);
  const timeRemainingMs = useSessionStore((s) => s.timeRemainingMs);
  const distractionCount = useSessionStore((s) => s.distractionCount);
  const stopSession = useSessionStore((s) => s.stopSession);

  return (
    <Card className="flex flex-col items-center gap-4">
      <Badge variant="success">Session Active</Badge>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {currentSessionName}
      </h2>
      <div className="text-6xl font-mono font-bold text-focus-600 dark:text-focus-400">
        {formatMsToTimer(timeRemainingMs)}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {distractionCount} distraction{distractionCount !== 1 ? "s" : ""}{" "}
        blocked
      </p>
      <Button variant="danger" onClick={stopSession}>
        Stop Session
      </Button>
    </Card>
  );
}

function TodayStatsSection() {
  const todayStats = useSessionStore((s) => s.todayStats);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Today&apos;s Stats
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Focus Time"
          value={formatMinutesToDisplay(todayStats.focusMinutes)}
          icon={"\u23F1\uFE0F"}
          trend="up"
        />
        <StatCard
          label="Sessions"
          value={todayStats.sessionsCompleted}
          icon={"\u2705"}
          trend="neutral"
        />
        <StatCard
          label="Distractions Blocked"
          value={todayStats.distractionsBlocked}
          icon={"\uD83D\uDEE1\uFE0F"}
          trend="down"
        />
        <StatCard
          label="Streak"
          value={`${todayStats.currentStreak} days`}
          icon={"\uD83D\uDD25"}
          trend="up"
        />
      </div>
    </div>
  );
}

function RecentActivitySection() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Recent Activity
      </h2>
      <Card className="divide-y divide-gray-100 dark:divide-gray-700 p-0">
        {RECENT_SESSIONS.map((session, index) => (
          <div
            key={`${session.name}-${index}`}
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-900 dark:text-white font-medium">
                {session.name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {session.duration}
              </span>
            </div>
            <Badge
              variant={session.status === "completed" ? "success" : "warning"}
            >
              {session.status === "completed" ? "Completed" : "Aborted"}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function HomePage() {
  const isSessionActive = useSessionStore((s) => s.isSessionActive);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {isSessionActive ? "Session active!" : "Ready to focus?"}
        </p>
      </div>

      {isSessionActive ? <ActiveSessionSection /> : <QuickStartSection />}

      <TodayStatsSection />

      <RecentActivitySection />
    </div>
  );
}
