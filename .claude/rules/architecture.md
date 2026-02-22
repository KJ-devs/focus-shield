# Architecture Rules — Focus Shield

Stack: Tauri 2.0 + React 18 + Tailwind CSS + SQLite + pnpm + Turborepo + Vitest + Playwright + Manifest V3 + Zustand + Recharts

---

## 1. Monorepo Structure & Package Boundaries

### Directory layout

```
focus-shield/
├── apps/
│   ├── desktop/              # Tauri app (React frontend + Rust backend)
│   ├── browser-extension/    # Manifest V3 extension
│   ├── web/                  # Next.js dashboard (optional)
│   └── sync-server/          # NestJS sync server (optional)
├── packages/
│   ├── shared-types/         # TypeScript types only — zero runtime code
│   ├── session-engine/       # Pure TS — session state machine, timers, presets
│   ├── crypto/               # Pure TS — token generation, hashing, encryption
│   ├── blocker-core/         # Pure TS — domain matching, process matching, blocklists
│   ├── storage/              # Pure TS — SQLite abstraction, CRUD, migrations
│   └── ui-components/        # React components — the ONLY package with React
```

### Import rules

- **YOU MUST** respect the dependency direction: `apps → packages`, never `packages → apps`
- **YOU MUST NOT** import between apps — `desktop` must not import from `browser-extension` and vice versa
- **YOU MUST NOT** import React or any UI framework in `session-engine`, `crypto`, `blocker-core`, or `storage` — these are pure TypeScript packages
- **YOU MUST** import shared types via `@focus-shield/shared-types` — never duplicate type definitions
- **YOU MUST** use the `@focus-shield/` scope prefix for all internal packages (configured in `pnpm-workspace.yaml`)
- **YOU MUST NOT** have circular dependencies between packages — the dependency graph is:
  ```
  shared-types        (depends on nothing)
  crypto              (depends on shared-types)
  blocker-core        (depends on shared-types)
  session-engine      (depends on shared-types, crypto)
  storage             (depends on shared-types)
  ui-components       (depends on shared-types)
  ```
- **YOU MUST NOT** import `storage` from inside `session-engine` or `crypto` — business logic packages must not know about persistence

### What goes where

- **`shared-types`**: interfaces, enums, type aliases, Zod schemas for validation. Zero runtime dependencies besides Zod.
- **`session-engine`**: state machine logic, timer management, preset definitions, focus score calculation. No I/O, no persistence, no UI.
- **`crypto`**: token generation, Argon2 hashing, AES-256 encryption, rate limiting logic. No I/O except crypto primitives.
- **`blocker-core`**: domain pattern matching (`*.reddit.com`), process name matching, blocklist preset definitions, allowlist logic. No system calls — just matching logic.
- **`storage`**: SQLite schema, migrations, CRUD operations, data aggregation queries. This is the only package that touches the database.
- **`ui-components`**: reusable React components (buttons, inputs, timers, charts). No business logic, no direct store access — receives data via props.

### Barrel exports

- **YOU MUST** provide a single `src/index.ts` barrel export per package
- **YOU MUST** export only the public API from the barrel — internal helpers stay unexported
- **YOU MUST NOT** use deep imports like `@focus-shield/session-engine/src/internal/timer` — only import from the package root

---

## 2. Tauri Patterns

### IPC commands (Rust ↔ React)

- **YOU MUST** define all Tauri IPC commands in `apps/desktop/src-tauri/src/commands/` organized by domain (e.g., `session_commands.rs`, `blocker_commands.rs`, `storage_commands.rs`)
- **YOU MUST** create a typed TypeScript wrapper for each Tauri command in `apps/desktop/src/tauri/` — never call `invoke()` directly from React components
- **YOU MUST** name commands with the convention `{domain}_{action}` in snake_case on the Rust side (e.g., `session_start`, `blocker_update_rules`, `storage_get_stats`)
- **YOU MUST** define the request/response types in `shared-types` and use `serde` derive macros on the Rust side to match them
- **YOU MUST NOT** pass complex nested objects through IPC — serialize to flat structures or JSON strings
- **YOU MUST** handle errors on the Rust side with a consistent `Result<T, FocusError>` type that serializes to a structured error object

```typescript
// apps/desktop/src/tauri/session.ts — typed wrapper example
import { invoke } from '@tauri-apps/api/core';
import type { Session, SessionRun } from '@focus-shield/shared-types';

export async function startSession(sessionId: string): Promise<SessionRun> {
  return invoke('session_start', { sessionId });
}
```

### Rust backend structure

- **YOU MUST** organize the Rust backend in `src-tauri/src/` as:
  ```
  src-tauri/src/
  ├── main.rs              # Tauri builder setup, command registration
  ├── commands/            # IPC command handlers (thin layer — delegates to services)
  ├── services/            # Business logic (session management, blocker orchestration)
  ├── models/              # Rust structs matching shared-types (with serde)
  ├── db/                  # SQLite operations via sqlx or rusqlite
  ├── daemon/              # Sidecar communication (named pipe / unix socket)
  └── error.rs             # Centralized error type
  ```
- **YOU MUST** keep command handlers thin — they validate input, call a service, and return the result
- **YOU MUST NOT** put business logic directly in command handlers

### Sidecar daemon

- **YOU MUST** communicate with the sidecar daemon via named pipe on Windows and Unix socket on Linux/macOS
- **YOU MUST** define a message protocol (JSON-based) for daemon communication in `shared-types`
- **YOU MUST** implement a health check mechanism — the Tauri app must detect if the daemon is running and restart it if needed
- **YOU MUST** ensure the daemon cleans up system modifications (hosts file, suspended processes) on crash via a watchdog or startup cleanup routine

---

## 3. React Patterns

### Component organization

- **YOU MUST** organize React code in `apps/desktop/src/` as:
  ```
  src/
  ├── components/          # App-specific composed components
  │   ├── session/         # SessionTimer, SessionLauncher, SessionReview
  │   ├── blocker/         # BlocklistEditor, BlockedPage
  │   ├── dashboard/       # StatsCards, Heatmap, TrendChart
  │   └── settings/        # LockLevelSelector, ProfileSwitcher
  ├── pages/               # Top-level route pages (Home, Session, Analytics, Settings)
  ├── stores/              # Zustand stores
  ├── hooks/               # Custom React hooks
  ├── tauri/               # Typed Tauri IPC wrappers (no React — pure async functions)
  ├── lib/                 # Utilities, formatters, constants
  └── App.tsx
  ```
- **YOU MUST** colocate components with their domain — `components/session/` contains everything related to the session UI
- **YOU MUST NOT** create a flat `components/` folder with 50+ files — always group by feature domain
- **YOU MUST** use PascalCase for component files (`SessionTimer.tsx`) and camelCase for non-component files (`useTimer.ts`, `formatDuration.ts`)

### Hooks

- **YOU MUST** extract logic into custom hooks when a component exceeds 100 lines or when logic is reused
- **YOU MUST** prefix custom hooks with `use` and place them in `hooks/` if reusable, or colocate with the component if single-use
- **YOU MUST NOT** call Tauri IPC directly from components — use hooks or store actions that wrap the typed Tauri functions
- **YOU MUST** use `useQuery`-style patterns for data fetching from SQLite (load → loading state → data → error)

### Zustand stores

- **YOU MUST** create one store per domain: `useSessionStore`, `useBlockerStore`, `useStatsStore`, `useProfileStore`, `useSettingsStore`
- **YOU MUST** define stores in `src/stores/` with the naming convention `use{Domain}Store.ts`
- **YOU MUST** keep stores flat — no deeply nested state objects. Normalize data.
- **YOU MUST** separate state, computed values, and actions in the store definition:
  ```typescript
  interface SessionStore {
    // State
    currentRun: SessionRun | null;
    sessions: Session[];
    isLoading: boolean;

    // Actions
    startSession: (id: string) => Promise<void>;
    stopSession: () => Promise<void>;
    loadSessions: () => Promise<void>;
  }
  ```
- **YOU MUST NOT** put UI state (modal open/close, form values, tab selection) in Zustand stores — use React local state for ephemeral UI state
- **YOU MUST** persist critical state to SQLite via the `storage` package — Zustand is an in-memory cache, not the source of truth
- **YOU MUST NOT** import Zustand stores in packages — stores live in `apps/` only

### Tailwind CSS

- **YOU MUST** use Tailwind utility classes directly in JSX — no separate CSS files unless absolutely necessary for animations
- **YOU MUST NOT** use inline `style={}` attributes — use Tailwind classes or CSS custom properties
- **YOU MUST** use Tailwind's `dark:` variant for dark mode support — define the theme in `tailwind.config.ts`
- **YOU MUST** extract repeated class combinations into `ui-components` as reusable React components, not as `@apply` directives

---

## 4. Package Design

### Pure TypeScript packages

- **YOU MUST** write `session-engine`, `crypto`, `blocker-core`, and `storage` as pure TypeScript with zero React dependency
- **YOU MUST** make packages testable in isolation with Vitest — no Tauri runtime, no browser APIs, no DOM
- **YOU MUST** use dependency injection for I/O boundaries — pass adapters as constructor arguments or function parameters:
  ```typescript
  // Good: storage adapter is injected
  function createSessionEngine(storage: SessionStorage): SessionEngine { ... }

  // Bad: hardcoded import
  import { db } from '../storage/db';
  ```
- **YOU MUST** export factory functions or classes with clear constructors — no global singletons in packages
- **YOU MUST** define package-level error types that extend a base `FocusError` from `shared-types`

### API design

- **YOU MUST** design package APIs as synchronous pure functions where possible — push async I/O to the edges (storage, Tauri commands)
- **YOU MUST** use the Result pattern (return `{ success: true, data } | { success: false, error }`) instead of throwing exceptions in package code
- **YOU MUST NOT** expose internal implementation details — if a function is not in `index.ts`, it is private

---

## 5. Data Flow

### Source of truth

```
SQLite (disk) → storage package (CRUD) → Tauri IPC → Zustand store (memory cache) → React UI (render)
          ↑                                                    │
          └──────────── user action → store action → IPC ──────┘
```

- **YOU MUST** treat SQLite as the single source of truth for all persistent data (sessions, runs, stats, config, achievements)
- **YOU MUST** hydrate Zustand stores from SQLite on app startup via Tauri IPC
- **YOU MUST NOT** write directly to SQLite from React — always go through Tauri IPC commands which delegate to the `storage` package on the Rust side, or invoke storage operations through the Tauri command layer
- **YOU MUST** update both SQLite (via IPC) and the Zustand store in the same action — keep them in sync:
  ```typescript
  // In Zustand store action
  startSession: async (id) => {
    const run = await tauriSession.startSession(id); // writes to SQLite via Rust
    set({ currentRun: run }); // updates in-memory state
  }
  ```

### Session engine data flow

- **YOU MUST** run the session engine state machine in the Rust backend (not in React) — the Rust process is the authoritative timer
- **YOU MUST** push state updates from Rust to React via Tauri events (`emit`), not by polling
- **YOU MUST** use Tauri event listeners in React to receive real-time updates (timer ticks, state transitions, distraction attempts)

### Browser extension communication

- **YOU MUST** communicate between the desktop app and the browser extension via Chrome Native Messaging API (primary) or WebSocket on localhost (fallback)
- **YOU MUST** define a shared message protocol in `shared-types` for desktop-extension communication
- **YOU MUST NOT** let the browser extension access SQLite directly — it receives blocking rules from the desktop app

---

## 6. Error Handling

### Package layer (shared-types, session-engine, crypto, blocker-core, storage)

- **YOU MUST** use typed Result objects — never throw exceptions from package code
- **YOU MUST** define domain-specific error types per package:
  ```typescript
  // In @focus-shield/crypto
  type CryptoError =
    | { code: 'INVALID_TOKEN'; message: string }
    | { code: 'RATE_LIMITED'; retryAfter: number }
    | { code: 'HASH_FAILED'; message: string };

  type CryptoResult<T> = { ok: true; data: T } | { ok: false; error: CryptoError };
  ```
- **YOU MUST NOT** use generic `Error` or string error messages in packages — always use structured error codes

### Tauri / Rust layer

- **YOU MUST** define a centralized `FocusError` enum in Rust that implements `serde::Serialize` and `Into<InvokeError>`
- **YOU MUST** map Rust errors to structured JSON that the TypeScript side can parse and handle
- **YOU MUST** log all errors on the Rust side before returning them to the frontend

### React / UI layer

- **YOU MUST** catch IPC errors in Zustand store actions and set error state — never let errors propagate unhandled
- **YOU MUST** display user-facing error messages via toast notifications or inline error states — never show raw error codes or stack traces
- **YOU MUST** implement error boundaries at the page level to catch rendering crashes without killing the entire app

### Storage layer

- **YOU MUST** wrap all SQLite operations in transactions when they involve multiple writes
- **YOU MUST** handle migration failures gracefully — log the error, show a user-facing message, and prevent data corruption
- **YOU MUST NOT** silently swallow storage errors — a failed write must be reported to the caller

---

## 7. Cross-Platform Considerations (Windows / macOS / Linux)

### File paths

- **YOU MUST** use Tauri's path APIs (`app_data_dir`, `app_config_dir`) for all file paths — never hardcode OS-specific paths
- **YOU MUST NOT** assume path separators — use `path.join()` or Rust's `std::path::PathBuf`
- **YOU MUST** handle the hosts file location per platform:
  - Windows: `C:\Windows\System32\drivers\etc\hosts`
  - macOS/Linux: `/etc/hosts`

### Process management

- **YOU MUST** abstract process operations behind a platform trait in Rust:
  ```rust
  trait ProcessManager {
      fn list_processes(&self) -> Result<Vec<ProcessInfo>>;
      fn suspend(&self, pid: u32) -> Result<()>;
      fn resume(&self, pid: u32) -> Result<()>;
      fn kill(&self, pid: u32) -> Result<()>;
  }
  ```
- **YOU MUST** implement platform-specific process management:
  - Windows: `SuspendThread`/`ResumeThread` via Windows API
  - Linux: `SIGSTOP`/`SIGCONT`
  - macOS: `SIGSTOP`/`SIGCONT`
- **YOU MUST** handle process names differently per platform — Windows uses `.exe` suffix, others do not. The `blocker-core` package must normalize process names.

### Privilege escalation

- **YOU MUST** request admin/root privileges only for the daemon sidecar, not for the main Tauri app
- **YOU MUST** handle UAC prompts on Windows, `pkexec`/`sudo` on Linux, and authorization services on macOS
- **YOU MUST** fail gracefully if privilege escalation is denied — hosts-level blocking becomes unavailable but browser extension blocking still works

### Daemon / sidecar communication

- **YOU MUST** use named pipes on Windows (`\\.\pipe\focus-shield-daemon`) and Unix domain sockets on Linux/macOS (`/tmp/focus-shield-daemon.sock`)
- **YOU MUST** abstract the transport behind a common `DaemonClient` interface so the Tauri app code is platform-agnostic

### Keyboard and input handling

- **YOU MUST** handle platform-specific keyboard shortcuts (Cmd on macOS, Ctrl on Windows/Linux)
- **YOU MUST** test the anti-paste mechanism on all platforms — clipboard APIs differ between OSes

---

## 8. Testing Strategy

### Package tests (Vitest)

- **YOU MUST** write unit tests for every public function in `session-engine`, `crypto`, `blocker-core`, and `storage`
- **YOU MUST** test packages in isolation — mock I/O boundaries, never require a running Tauri or SQLite instance for pure package tests
- **YOU MUST** use in-memory SQLite for `storage` package tests — never touch real database files
- **YOU MUST** place test files next to source files with the `.test.ts` suffix (e.g., `timer.ts` and `timer.test.ts`)

### App tests (Playwright)

- **YOU MUST** write E2E tests for critical user flows: start session, block distraction, complete session, view stats
- **YOU MUST** place E2E tests in `apps/desktop/e2e/` and `apps/browser-extension/e2e/`

### Turborepo pipeline

- **YOU MUST** configure `turbo.json` so that `test` and `lint` tasks depend on `build` of upstream packages
- **YOU MUST** ensure `packages/shared-types` is built before any other package

---

## 9. Browser Extension Architecture

- **YOU MUST** organize the extension source in `apps/browser-extension/src/` as:
  ```
  src/
  ├── background/          # Service worker — request interception, native messaging
  ├── content/             # Content scripts injected into pages
  ├── popup/               # Popup UI (React, minimal)
  ├── blocked/             # Blocked page (React, standalone)
  └── shared/              # Shared utilities between extension contexts
  ```
- **YOU MUST** use `declarativeNetRequest` for request blocking — not the deprecated `webRequest` API
- **YOU MUST** keep the popup lightweight — it shows session status and basic controls, no heavy logic
- **YOU MUST** build the blocked page as a self-contained HTML + React bundle served by the extension
- **YOU MUST NOT** import from `apps/desktop/` — the extension shares code only via `packages/`
- **YOU MUST** support both Chrome and Firefox — abstract browser API differences behind a compatibility layer using `webextension-polyfill` or conditional imports
