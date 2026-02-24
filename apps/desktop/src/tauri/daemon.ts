import { invoke } from "@tauri-apps/api/core";
import type {
  DaemonStatusData,
  DaemonDomainRule,
  DaemonProcessRule,
} from "@focus-shield/shared-types";

/** Ensure the daemon sidecar is running */
export async function daemonStart(): Promise<void> {
  return invoke("daemon_start");
}

/** Stop the daemon sidecar */
export async function daemonStop(): Promise<void> {
  return invoke("daemon_stop");
}

/** Get daemon status */
export async function daemonStatus(): Promise<DaemonStatusData> {
  return invoke("daemon_status");
}

/** Check if the daemon is alive */
export async function daemonHealthCheck(): Promise<boolean> {
  return invoke("daemon_health_check");
}

/** Start blocking domains and processes for a session */
export async function daemonStartBlocking(
  sessionId: string,
  domains: DaemonDomainRule[],
  processes: DaemonProcessRule[],
): Promise<void> {
  return invoke("daemon_start_blocking", {
    request: {
      sessionId,
      domains,
      processes,
    },
  });
}

/** Stop blocking for a session */
export async function daemonStopBlocking(sessionId: string): Promise<void> {
  return invoke("daemon_stop_blocking", { sessionId });
}
