import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/Button";
import { getRandomQuote } from "@/data/quotes";
import { getThemeById } from "@/data/block-themes";
import { BreathingExercise } from "@/components/blocked/BreathingExercise";
import type { Quote } from "@/data/quotes";
import type { BlockTheme } from "@/data/block-themes";

interface BlockedPageProps {
  /** Custom message to display on the block page. */
  message?: string;
  /** The domain or resource that was blocked. */
  blockedTarget?: string;
  /** Theme ID to use for styling. Defaults to "default". */
  themeId?: string;
}

function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function QuoteBlock({ quote, theme }: { quote: Quote; theme: BlockTheme }) {
  return (
    <div className="max-w-lg text-center">
      <blockquote className={`text-lg italic ${theme.textClass}`}>
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      <p className={`mt-2 text-sm font-medium opacity-70 ${theme.textClass}`}>
        &mdash; {quote.author}
      </p>
    </div>
  );
}

function SessionTimer({
  timeRemainingMs,
  theme,
}: {
  timeRemainingMs: number;
  theme: BlockTheme;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-medium opacity-60">Session ends in</span>
      <span className={`font-mono text-4xl font-bold ${theme.accentClass}`}>
        {formatTimeRemaining(timeRemainingMs)}
      </span>
    </div>
  );
}

function DistractionCounter({
  count,
  theme,
}: {
  count: number;
  theme: BlockTheme;
}) {
  return (
    <div className={`rounded-lg bg-white/30 dark:bg-black/20 px-4 py-2 text-sm font-medium ${theme.textClass}`}>
      {count} distraction{count !== 1 ? "s" : ""} blocked this session
    </div>
  );
}

export function BlockedPage({
  message,
  blockedTarget,
  themeId = "default",
}: BlockedPageProps) {
  const [quote] = useState<Quote>(() => getRandomQuote());
  const [showBreathing, setShowBreathing] = useState(false);
  const theme = getThemeById(themeId);
  const navigate = useNavigate();

  const timeRemainingMs = useSessionStore((s) => s.timeRemainingMs);
  const distractionCount = useSessionStore((s) => s.distractionCount);
  const isSessionActive = useSessionStore((s) => s.isSessionActive);

  const displayMessage =
    message ?? "Stay focused. You can do this.";

  const handleBreathingComplete = useCallback(() => {
    setShowBreathing(false);
  }, []);

  const handleBackToWork = () => {
    navigate("/");
  };

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center gap-8 p-8 ${theme.bgClass}`}
    >
      {/* Shield icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/40 dark:bg-black/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className={`h-10 w-10 ${theme.accentClass}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2.25l8.25 4.125v5.25c0 5.03-3.54 9.596-8.25 11.125C7.29 21.221 3.75 16.654 3.75 11.625v-5.25L12 2.25z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4"
          />
        </svg>
      </div>

      {/* Main message */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold ${theme.textClass}`}>
          Site Blocked
        </h1>
        {blockedTarget && (
          <p className={`mt-2 text-sm font-medium opacity-50 ${theme.textClass}`}>
            {blockedTarget}
          </p>
        )}
      </div>

      {/* Custom message */}
      <p className={`max-w-md text-center text-lg ${theme.textClass}`}>
        {displayMessage}
      </p>

      {/* Motivational quote */}
      <QuoteBlock quote={quote} theme={theme} />

      {/* Session timer */}
      {isSessionActive && (
        <SessionTimer timeRemainingMs={timeRemainingMs} theme={theme} />
      )}

      {/* Distraction counter */}
      {isSessionActive && (
        <DistractionCounter count={distractionCount} theme={theme} />
      )}

      {/* Breathing exercise or toggle */}
      {showBreathing ? (
        <div className="rounded-2xl bg-white/50 p-6 dark:bg-black/20">
          <BreathingExercise onComplete={handleBreathingComplete} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowBreathing(true)}
          className={`text-sm font-medium underline decoration-dotted underline-offset-4 opacity-60 hover:opacity-100 transition-opacity ${theme.textClass}`}
        >
          Need a moment? Try a 30-second breathing exercise
        </button>
      )}

      {/* Back to work */}
      <Button variant="primary" size="lg" onClick={handleBackToWork}>
        Back to Work
      </Button>
    </div>
  );
}
