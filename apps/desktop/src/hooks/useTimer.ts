import { useEffect } from "react";
import { initSessionListeners } from "@/stores/session-store";

let initialized = false;

/**
 * Initialize Tauri session event listeners.
 *
 * The timer now runs in Rust. This hook sets up the event listeners
 * that sync the Rust state into the Zustand store. Call once from
 * the root component.
 */
export function useTimer(): void {
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      initSessionListeners();
    }
  }, []);
}
