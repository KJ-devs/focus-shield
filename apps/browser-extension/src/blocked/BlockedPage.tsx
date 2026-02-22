import { useEffect, useState } from "react";
import { getRandomQuote } from "../quotes";
import type { Quote } from "../quotes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlockingState {
  isActive: boolean;
  endTime: string | null;
  distractionCount: number;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    color: "#ffffff",
    padding: "32px",
    textAlign: "center" as const,
  },
  shield: {
    fontSize: "80px",
    marginBottom: "24px",
    lineHeight: 1,
  },
  heading: {
    fontSize: "36px",
    fontWeight: 700 as const,
    marginBottom: "12px",
    color: "#ffffff",
  },
  message: {
    fontSize: "18px",
    color: "#a0aec0",
    marginBottom: "40px",
    maxWidth: "500px",
    lineHeight: 1.6,
  },
  quoteContainer: {
    background: "rgba(67, 97, 238, 0.15)",
    border: "1px solid rgba(67, 97, 238, 0.3)",
    borderRadius: "12px",
    padding: "24px 32px",
    maxWidth: "520px",
    marginBottom: "40px",
  },
  quoteText: {
    fontSize: "16px",
    fontStyle: "italic" as const,
    color: "#e2e8f0",
    lineHeight: 1.6,
    marginBottom: "8px",
  },
  quoteAuthor: {
    fontSize: "14px",
    color: "#4361ee",
    fontWeight: 500 as const,
  },
  statsRow: {
    display: "flex",
    gap: "48px",
    marginBottom: "40px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  statItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: 700 as const,
    color: "#4361ee",
  },
  statLabel: {
    fontSize: "13px",
    color: "#a0aec0",
    marginTop: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  button: {
    background: "#4361ee",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: 600 as const,
    cursor: "pointer",
    transition: "background 0.2s",
  },
} as const;

// ---------------------------------------------------------------------------
// Timer helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlockedPage() {
  const [quote] = useState<Quote>(getRandomQuote);
  const [timeRemaining, setTimeRemaining] = useState<string>("--:--");
  const [distractionCount, setDistractionCount] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(true);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function loadState(): void {
      chrome.storage.local.get("focusShield_blockingState", (result) => {
        const state = result["focusShield_blockingState"] as
          | BlockingState
          | undefined;

        if (!state || !state.isActive) {
          setIsSessionActive(false);
          setTimeRemaining("00:00");
          return;
        }

        setDistractionCount(state.distractionCount);

        if (state.endTime) {
          const updateTimer = (): void => {
            const remaining = new Date(state.endTime as string).getTime() - Date.now();
            if (remaining <= 0) {
              setTimeRemaining("00:00");
              setIsSessionActive(false);
              if (intervalId) clearInterval(intervalId);
            } else {
              setTimeRemaining(formatTimeRemaining(remaining));
            }
          };

          updateTimer();
          intervalId = setInterval(updateTimer, 1000);
        }
      });
    }

    loadState();

    // Refresh state periodically to pick up distraction count changes
    const refreshId = setInterval(loadState, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      clearInterval(refreshId);
    };
  }, []);

  function handleBackToWork(): void {
    // Navigate to a new tab — the safest "back to work" destination
    chrome.tabs.update({ url: "chrome://newtab" });
  }

  return (
    <div style={styles.container}>
      <div style={styles.shield} role="img" aria-label="Shield">
        {"\u{1F6E1}\u{FE0F}"}
      </div>

      <h1 style={styles.heading}>Site Blocked</h1>

      <p style={styles.message}>
        {isSessionActive
          ? "Stay focused! You're doing great. This site is blocked during your focus session."
          : "Your focus session has ended. Great work!"}
      </p>

      <div style={styles.quoteContainer}>
        <p style={styles.quoteText}>"{quote.text}"</p>
        <p style={styles.quoteAuthor}>-- {quote.author}</p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{timeRemaining}</span>
          <span style={styles.statLabel}>Time Remaining</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{distractionCount}</span>
          <span style={styles.statLabel}>Sites Blocked</span>
        </div>
      </div>

      <button
        style={styles.button}
        onClick={handleBackToWork}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.background = "#3651d4";
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.background = "#4361ee";
        }}
      >
        Back to Work
      </button>
    </div>
  );
}
