import { type ReactNode, useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { ExtensionBanner } from "@/components/settings/ExtensionInstall";
import {
  storageGetRecentSessions,
  type RecentSession as RecentSessionData,
} from "@/tauri/storage";

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

function IconTimer() {
  return (
    <svg className="h-8 w-8 text-focus-500" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="18" r="10" />
      <path d="M16 12v6l4 2" />
      <path d="M12 4h8M16 4v4" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg className="h-8 w-8 text-purple-500" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 28V16" />
      <path d="M12 8a4 4 0 014-4 4 4 0 014 4" />
      <path d="M8 14a4 4 0 010-4c1.5 0 3 .5 4 2" />
      <path d="M24 14a4 4 0 000-4c-1.5 0-3 .5-4 2" />
      <path d="M7 20a4 4 0 01-1-6" />
      <path d="M25 20a4 4 0 001-6" />
      <path d="M10 25a4 4 0 01-3-5" />
      <path d="M22 25a4 4 0 003-5" />
      <path d="M12 28a4 4 0 01-2-3" />
      <path d="M20 28a4 4 0 002-3" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg className="h-8 w-8 text-amber-500" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 4L8 18h7l-1 10 10-14h-7l1-10z" />
    </svg>
  );
}

interface QuickPreset {
  name: string;
  durationMinutes: number;
  icon: () => ReactNode;
  gradient: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { name: "Pomodoro", durationMinutes: 25, icon: IconTimer, gradient: "from-focus-50 to-blue-50 dark:from-focus-900/10 dark:to-blue-900/10" },
  { name: "Deep Work", durationMinutes: 90, icon: IconBrain, gradient: "from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10" },
  { name: "Quick Focus", durationMinutes: 15, icon: IconBolt, gradient: "from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10" },
];

function formatMinutesToDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function QuickStartSection() {
  const startQuickSession = useSessionStore((s) => s.startQuickSession);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Quick Start
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <Card
              key={preset.name}
              data-testid={`quick-start-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`group flex flex-col items-center gap-4 bg-gradient-to-br ${preset.gradient} cursor-pointer border-2 border-transparent transition-all duration-200 hover:border-focus-300 hover:shadow-lg dark:hover:border-focus-700`}
              onClick={() =>
                startQuickSession(
                  preset.name,
                  preset.durationMinutes * 60 * 1000,
                )
              }
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/80 shadow-sm transition-transform duration-200 group-hover:scale-110 dark:bg-gray-800/80">
                <Icon />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {preset.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {preset.durationMinutes} min
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  startQuickSession(
                    preset.name,
                    preset.durationMinutes * 60 * 1000,
                  );
                }}
              >
                Start
              </Button>
            </Card>
          );
        })}
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
    <Card data-testid="active-session-widget" className="flex flex-col items-center gap-4">
      <Badge variant="success">Session Active</Badge>
      <h2 data-testid="session-name" className="text-xl font-semibold text-gray-900 dark:text-white">
        {currentSessionName}
      </h2>
      <div data-testid="session-timer" className="text-6xl font-mono font-bold text-focus-600 dark:text-focus-400">
        {formatMsToTimer(timeRemainingMs)}
      </div>
      <p data-testid="distraction-count" className="text-sm text-gray-500 dark:text-gray-400">
        {distractionCount} distraction{distractionCount !== 1 ? "s" : ""}{" "}
        blocked
      </p>
      <Button data-testid="stop-session-btn" variant="danger" onClick={() => void stopSession()}>
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
          data-testid="stat-focus-time"
        />
        <StatCard
          label="Sessions"
          value={todayStats.sessionsCompleted}
          icon={"\u2705"}
          trend="neutral"
          data-testid="stat-sessions"
        />
        <StatCard
          label="Distractions Blocked"
          value={todayStats.distractionsBlocked}
          icon={"\uD83D\uDEE1\uFE0F"}
          trend="down"
          data-testid="stat-distractions"
        />
        <StatCard
          label="Streak"
          value={`${todayStats.currentStreak} days`}
          icon={"\uD83D\uDD25"}
          trend="up"
          data-testid="stat-streak"
        />
      </div>
    </div>
  );
}

function RecentActivitySection() {
  const [recentSessions, setRecentSessions] = useState<RecentSessionData[]>([]);

  useEffect(() => {
    void storageGetRecentSessions(5).then(setRecentSessions).catch(() => {
      // Not in Tauri or DB not ready
    });
  }, []);

  // Also refresh when phase returns to idle (session just completed)
  const phase = useSessionStore((s) => s.phase);
  useEffect(() => {
    if (phase === "idle") {
      void storageGetRecentSessions(5).then(setRecentSessions).catch(() => {});
    }
  }, [phase]);

  if (recentSessions.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <Card className="p-6 text-center text-gray-500 dark:text-gray-400">
          No sessions yet. Start your first focus session!
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Recent Activity
      </h2>
      <Card data-testid="recent-activity-list" className="divide-y divide-gray-100 dark:divide-gray-700 p-0">
        {recentSessions.map((session) => (
          <div
            key={session.id}
            data-testid="recent-session-item"
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-900 dark:text-white font-medium">
                {session.sessionId}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatMinutesToDuration(session.totalFocusMinutes)}
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
      <div className="animate-[fadeSlideIn_0.4s_ease-out]">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {isSessionActive ? "Session active!" : "Ready to focus?"}
        </p>
      </div>

      <ExtensionBanner />

      {isSessionActive ? <ActiveSessionSection /> : <QuickStartSection />}

      <TodayStatsSection />

      <RecentActivitySection />
    </div>
  );
}
