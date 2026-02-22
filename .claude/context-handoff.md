# Context Handoff — Focus Shield

## État actuel du projet

### US terminées
- **US-00 (#1)** — Init monorepo : DONE, closed
- **US-01 (#2)** — Package shared-types : DONE, closed
- **US-02 (#3)** — Package session-engine : DONE, closed (193 tests)
- **US-03 (#4)** — Package crypto : DONE, closed (52 tests)
  - Token generator: CSPRNG + rejection sampling, 5 levels (8-48 chars)
  - Argon2id hasher: hash-wasm WASM, OWASP params, self-contained encoded output
  - Timing-safe verifier: SHA-256 normalized constant-time comparison
  - Rate limiter: 3 attempts → 5 min cooldown, auto-expiry
  - Security reviewed: fixed modulo bias, documented timing-safe delegation

### Prochaine US à faire
- **US-04 (#6)** — Package blocker-core (domain matching, process matching, blocklist management)
  - Équipe : ts-package-dev, tester, stabilizer
  - Dépendance : US-01 (done)

### Ordre restant Phase 1 MVP
US-04(#6) → US-05(#8) → US-06(#10) → US-07(#12) → US-08(#14)

## Infos techniques clés
- **Repo** : https://github.com/KJ-devs/focus-shield
- **Branche** : main (push direct, pas de PR)
- **Dernier commit** : 8745d86
- **Package manager** : pnpm 10.4.1
- **Node** : v24.13.1
- **Rust** : NON installé (Tauri scaffoldé mais ne compile pas encore)
- **Stabilité** : `bash scripts/stability-check.sh` — STABLE
- **Total tests** : 245 (193 session-engine + 52 crypto)

## Structure du monorepo
```
packages/shared-types    → types TS (DONE)
packages/session-engine  → state machine + timer + presets + score + runner (DONE)
packages/crypto          → tokens + argon2 + verifier + rate-limiter (DONE)
packages/blocker-core    → placeholder (US-04)
packages/storage         → placeholder (US-05)
packages/ui-components   → placeholder
apps/desktop             → Tauri 2.0 + React + Tailwind (shell)
apps/browser-extension   → Manifest V3 + React (shell)
```

## Workflow rappel
- Commit direct sur main (pas de branches, pas de PR)
- `gh issue edit <n> --add-label "in-progress" --remove-label "task"` au début
- Stability check avant push
- `gh issue close <n>` à la fin
