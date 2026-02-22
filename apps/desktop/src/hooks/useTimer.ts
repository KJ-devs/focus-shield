import { useEffect } from "react";
import { useSessionStore } from "@/stores/session-store";

export function useTimer(): void {
  const phase = useSessionStore((s) => s.phase);
  const tick = useSessionStore((s) => s.tick);

  useEffect(() => {
    if (phase !== "active" && phase !== "unlock-prompt") return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);
}
