import { useEffect } from "react";
import { useSessionStore } from "@/stores/session-store";

export function useTimer(): void {
  const isSessionActive = useSessionStore((s) => s.isSessionActive);
  const tick = useSessionStore((s) => s.tick);

  useEffect(() => {
    if (!isSessionActive) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isSessionActive, tick]);
}
