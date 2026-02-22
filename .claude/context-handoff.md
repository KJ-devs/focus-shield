# Context Handoff — Focus Shield

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
