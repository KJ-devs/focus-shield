# Équipe Agentique — Focus Shield

> Auto-généré par `/init-project`. Ne pas modifier manuellement.

## Agents core (toujours présents)

### `forge`
**Rôle** : Team Lead — orchestre les agents, décompose les US, gère les feedback loops
**Toujours présent** : oui (orchestrateur principal)

### `stabilizer`
**Rôle** : Quality gate — build, tests, lint, type-check
**Toujours présent** : oui (toujours en dernier dans le pipeline)

### `reviewer`
**Rôle** : Revue de code qualité + sécurité
**Quand l'utiliser** : US de priorité haute ou domaine critique (crypto, blocage système)

---

## Agents spécialisés (générés pour Focus Shield)

### `ts-package-dev`
**Rôle** : Expert TypeScript packages purs (session-engine, crypto, blocker-core, storage, shared-types)
**Expertise** : State machines, timers, Argon2/AES-256, pattern matching, SQLite, event-driven patterns
**Invocation** : `/ts-package-dev`

### `desktop-dev`
**Rôle** : Expert Tauri 2.0 + React 18 + Tailwind desktop app
**Expertise** : Composants React, Zustand stores, Tauri IPC, system tray, notifications, dark/light theme
**Invocation** : `/desktop-dev`

### `extension-dev`
**Rôle** : Expert Chrome/Firefox Manifest V3 extensions
**Expertise** : Service worker, declarativeNetRequest, content scripts, popup React, Native Messaging
**Invocation** : `/extension-dev`

### `rust-dev`
**Rôle** : Expert Rust pour daemon Tauri sidecar
**Expertise** : Hosts file manager, process monitor/killer, IPC (named pipes/Unix sockets), service système
**Invocation** : `/rust-dev`

### `tester`
**Rôle** : Expert testing Vitest + Playwright
**Expertise** : Tests unitaires packages, intégration SQLite, composants React, E2E Tauri, extension Chrome
**Invocation** : `/tester`

---

## Composition d'équipe par US

| US | Agents assignés |
|----|----------------|
| US-00 Init monorepo | forge, stabilizer |
| US-01 shared-types | ts-package-dev, stabilizer |
| US-02 session-engine | ts-package-dev, tester, stabilizer |
| US-03 crypto | ts-package-dev, tester, reviewer, stabilizer |
| US-04 blocker-core | ts-package-dev, tester, stabilizer |
| US-05 storage | ts-package-dev, tester, stabilizer |
| US-06 Browser extension | extension-dev, tester, stabilizer |
| US-07 Desktop Layout + Home | desktop-dev, stabilizer |
| US-08 Desktop Session flow | desktop-dev, tester, reviewer, stabilizer |
| US-09 Session engine avancé | ts-package-dev, tester, stabilizer |
| US-10 Crypto avancé | ts-package-dev, tester, reviewer, stabilizer |
| US-11 Daemon Rust setup | rust-dev, stabilizer |
| US-12 Daemon hosts manager | rust-dev, tester, reviewer, stabilizer |
| US-13 Daemon process monitor | rust-dev, tester, stabilizer |
| US-14 Extension ↔ Desktop | extension-dev, rust-dev, tester, stabilizer |
| US-15 Storage avancé | ts-package-dev, tester, stabilizer |
| US-16 Analytics dashboard | desktop-dev, tester, stabilizer |
| US-17 Settings UI | desktop-dev, stabilizer |
| US-18 Multi-profils UI | desktop-dev, tester, stabilizer |
| US-19 Gamification engine | ts-package-dev, tester, stabilizer |
| US-20 System tray + notifs | desktop-dev, stabilizer |
| US-21 Sync server NestJS | ts-package-dev, tester, stabilizer |
| US-22 Auth + sync API | ts-package-dev, tester, reviewer, stabilizer |
| US-23 Buddy system | ts-package-dev, desktop-dev, tester, stabilizer |
| US-24 Challenges + coworking | ts-package-dev, desktop-dev, tester, stabilizer |
| US-25 E2E + build multi-platform | tester, stabilizer |
| US-26 Auto-update + docs | desktop-dev, stabilizer |

---

## Règles d'équipe

1. Le **stabilizer** intervient TOUJOURS en dernier
2. Le **reviewer** intervient sur les domaines critiques (crypto, auth, blocage système)
3. Au moins un agent de développement est TOUJOURS présent
4. Le **forge** évalue le résultat de chaque agent avant de passer au suivant
