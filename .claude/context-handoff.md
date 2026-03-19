# Context Handoff — Focus Shield

## Dernière session : Phases 1, 2 & 3 terminées — Prochaine: Phase 4 Error handling

### Plan global (voir PLAN-fondations.md)
- Phase 1 — Timer Rust ✅
- Phase 2 — Argon2 ✅
- Phase 3 — SQLite persistence ✅
- Phase 4 — Error handling (toasts, daemon status indicator) ← NEXT
- Phase 5 — Integration E2E

### Phase 1 — Timer Rust autoritatif (TERMINÉ)
**Problème** : Le timer session tournait dans React (`setInterval` dans `useTimer.ts`), manipulable via DevTools.
**Solution** : Timer déplacé côté Rust avec événements Tauri.

**Fichiers créés :**
- `src-tauri/src/session.rs` — SessionManager avec timer Tokio, token gen, rate limiting (3 tentatives → 5min cooldown)
- `src-tauri/src/commands/session_commands.rs` — 7 commandes IPC : session_start/stop/request_unlock/cancel_unlock/status/dismiss/record_distraction
- `src/tauri/session.ts` — Wrappers TypeScript typés pour les 7 commandes

**Fichiers modifiés :**
- `src-tauri/src/lib.rs` — Ajouté `SessionManager::new()` au `.manage()`, enregistré 7 nouvelles commandes
- `src-tauri/src/commands/mod.rs` — Export session_commands
- `src-tauri/Cargo.toml` — Ajouté `getrandom = "0.2"`
- `src/stores/session-store.ts` — **Réécrit** : miroir du state Rust, plus de timer local, plus de sha256 local, plus de MOCK_TODAY_STATS. Écoute les événements Tauri (`session:tick`, `session:phase_changed`, `session:completed`). Fonction `initSessionListeners()` exportée.
- `src/hooks/useTimer.ts` — **Réécrit** : initialise les event listeners Tauri une seule fois (plus de setInterval)
- `src/pages/SessionsPage.tsx` — UnlockPromptView utilise `stopSession(token)` via IPC (supprimé sha256 locale)
- `src/pages/HomePage.tsx` — Fix type stopSession (wrapper lambda)

### Phase 2 — Argon2 (TERMINÉ)
**Problème** : SHA-256 pour hasher les tokens — brute-force trivial (0.1ms/tentative).
**Solution** : Argon2id (200ms/tentative, 2000x plus lent).

**Fichiers modifiés :**
- `src-tauri/src/session.rs` — Supprimé ~80 lignes SHA-256 manuel, remplacé par `argon2_hash()` et `argon2_verify()` (Argon2id, memory=16MiB, time=2, parallelism=1, PHC format)
- `src-tauri/Cargo.toml` — Ajouté `argon2 = "0.5"`, `rand = "0.8"`

### Stability check final : STABLE ✓ (build + tests 700+ + lint + type-check)

### Phase 3 — SQLite Persistence (TERMINÉ)
**Problème** : Package `@focus-shield/storage` complet (183 tests) mais jamais branché. Dashboard affichait des données mockées.
**Solution** : Couche stockage Rust avec rusqlite, IPC commands, hydratation des stats au startup.

**Fichiers créés :**
- `src-tauri/src/db/mod.rs` — StorageManager avec rusqlite, 3 migrations (matching TS schema), CRUD session_runs, daily_stats, streak calculation
- `src-tauri/src/commands/storage_commands.rs` — 5 commandes IPC : storage_save_session_run, storage_get_today_stats, storage_get_recent_sessions, storage_get_stats_range, storage_get_streak
- `src/tauri/storage.ts` — Wrappers TypeScript typés pour les 5 commandes

**Fichiers modifiés :**
- `src-tauri/Cargo.toml` — Ajouté `rusqlite = "0.31"` (bundled), `chrono = "0.4"`
- `src-tauri/src/lib.rs` — Ajouté module `db`, init StorageManager au setup (app_data_dir/focus-shield.db), enregistré 5 nouvelles commandes
- `src-tauri/src/commands/mod.rs` — Export storage_commands
- `src/stores/session-store.ts` — Persist session on completion (persistSessionRun helper), load todayStats from DB on startup (loadTodayStats helper)
- `src/pages/HomePage.tsx` — Recent sessions loaded from DB (storageGetRecentSessions), empty state when no sessions yet
- `src/pages/AnalyticsPage.tsx` — Réécrit : plus de mock-analytics.ts, toutes les données viennent de storageGetStatsRange/storageGetStreak

**Note** : `src/data/mock-analytics.ts` est conservé (les types y sont encore importés par AnalyticsPage) mais les fonctions generate* ne sont plus appelées.

### Aussi fait dans cette session (avant les phases fondation)
- **E2E blocking tests** : `e2e/blocking-pipeline.spec.ts` (16 tests Chrome) et `e2e/multi-browser-blocking.spec.ts` (24 tests Chrome+Brave+Firefox)
- **Firefox manifest fix** : supprimé `declarative_net_request.rule_resources: []` (erreur Firefox), supprimé `nativeMessaging` permission, supprimé `data_collection_permissions`
- **Quickstart script** : `scripts/quickstart.sh` — setup complet + lancement
- **Rodin skill** : `.claude/skills/rodin/SKILL.md` — interlocuteur socratique

---

## État actuel du projet

### US terminées
- **US-00 (#1)** — Init monorepo : DONE, closed
- **US-01 (#2)** — Package shared-types : DONE, closed
- **US-02 (#3)** — Package session-engine : DONE, closed (193 tests)
- **US-03 (#4)** — Package crypto : DONE, closed (52 tests)
- **US-04 (#6)** — Package blocker-core : DONE, closed (116 tests)
  - Domain matcher: wildcard, exact, path-based matching
  - Process matcher: case-insensitive name + alias matching
  - 5 built-in presets: Social, Entertainment, Gaming, News, Shopping
  - Blocklist manager: merge, create, deduplicate
- **US-05 (#8)** — Package storage : DONE, closed (183 tests)
  - SQLite via better-sqlite3, in-memory for tests
  - Migration system with versioned schema
  - 5 repositories: sessions, sessionRuns, blocklists, profiles, stats
  - Storage facade with auto-migration

### Prochaine US à faire
- **US-06 (#10)** — Browser extension (Manifest V3, declarativeNetRequest, popup, blocked page)
  - Équipe : extension-dev, tester, stabilizer
  - Dépendance : US-01 (done), US-04 (done)

### Ordre restant Phase 1 MVP
US-06(#10) → US-07(#12) → US-08(#14)

## Infos techniques clés
- **Repo** : https://github.com/KJ-devs/focus-shield
- **Branche** : main (push direct, pas de PR)
- **Dernier commit** : 2f58afc
- **Package manager** : pnpm 10.4.1
- **Node** : v24.13.1
- **Rust** : NON installé (Tauri scaffoldé mais ne compile pas encore)
- **Stabilité** : `bash scripts/stability-check.sh` — STABLE
- **Total tests** : 544 (193 session-engine + 52 crypto + 116 blocker-core + 183 storage)

## Structure du monorepo
```
packages/shared-types    → types TS (DONE)
packages/session-engine  → state machine + timer + presets + score + runner (DONE)
packages/crypto          → tokens + argon2 + verifier + rate-limiter (DONE)
packages/blocker-core    → domain/process matching + presets + blocklist manager (DONE)
packages/storage         → SQLite + migrations + repositories + facade (DONE)
packages/ui-components   → placeholder
apps/desktop             → Tauri 2.0 + React + Tailwind (shell)
apps/browser-extension   → Manifest V3 + React (shell)
```

## Workflow rappel
- Commit direct sur main (pas de branches, pas de PR)
- `gh issue edit <n> --add-label "in-progress" --remove-label "task"` au début
- Stability check avant push
- `gh issue close <n>` à la fin
