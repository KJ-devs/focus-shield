# Focus Shield 🛡️

> Application open-source de blocage intelligent de distractions avec sessions configurables, verrouillage cryptographique et analytics de productivité.

---

## Table des matières

- [Vision](#vision)
- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Features](#features)
- [Modèles de données](#modèles-de-données)
- [Épics & Issues](#épics--issues)
- [Roadmap](#roadmap)
- [Conventions](#conventions)

---

## Vision

### Problème

Les travailleurs du numérique perdent des heures chaque jour sur des distractions (réseaux sociaux, YouTube, Reddit, Discord...). Les solutions existantes (Cold Turkey, Freedom, Forest) sont soit propriétaires, soit trop basiques, soit pas cross-platform, et aucune n'est self-hostable.

### Solution

Focus Shield est une application **open-source et self-hostable** de blocage de distractions combinant :

- Un moteur de sessions intelligent avec presets configurables (Pomodoro, Deep Work, Custom)
- Un système de verrouillage cryptographique à friction variable (le mot de passe de déverrouillage est généré dynamiquement et volontairement pénible à utiliser)
- Un blocage multi-niveaux (navigateur + DNS/hosts + process système)
- Un dashboard analytique complet avec gamification

### Public cible

- Développeurs et créatifs travaillant sur ordinateur
- Étudiants en période de révisions
- Freelances ayant besoin d'autodiscipline
- Personnes avec TDAH cherchant des outils de structure

### Différenciateurs clés

| Feature | Cold Turkey | Freedom | Forest | Focus Shield |
|---------|------------|---------|--------|--------------|
| Open source | ❌ | ❌ | ❌ | ✅ |
| Self-hosted | ❌ | ❌ | ❌ | ✅ |
| Blocage système (hosts) | ✅ | ✅ | ❌ | ✅ |
| Blocage process | ✅ | ❌ | ❌ | ✅ |
| Sessions configurables | Basique | Basique | Timer seul | Avancé |
| Verrouillage crypto | Partiel | ❌ | ❌ | Multi-niveaux |
| Analytics | Basique | Basique | ❌ | Complet |
| Gamification | ❌ | ❌ | ✅ | Multi-système |
| Gratuit | ❌ ($39) | ❌ ($7/mo) | Freemium | Open source |

---

## Stack Technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Desktop app | Tauri 2.0 | Léger (~10MB), accès natif système, backend Rust |
| UI Framework | React 18+ | Écosystème riche, composants partagés web/desktop |
| Styling | Tailwind CSS | Utility-first, rapid prototyping |
| Extension navigateur | Manifest V3 + React | Standard moderne Chrome/Firefox |
| Daemon système | Rust (Tauri sidecar) | Performance, accès bas niveau, sécurité mémoire |
| Storage local | SQLite (via Tauri SQL plugin) | Embarqué, pas de serveur externe requis |
| State management | Zustand | Léger, API simple, compatible React |
| Graphiques | Recharts | Intégration React native, composants déclaratifs |
| Sync server (optionnel) | NestJS + PostgreSQL | Self-hostable, TypeScript end-to-end |
| Monorepo | pnpm + Turborepo | Workspace management, builds parallèles |
| Crypto | Argon2 (hashing), AES-256 (chiffrement) | Standards industriels |
| Testing | Vitest + Playwright | Unit + E2E |
| CI/CD | GitHub Actions | Build multi-platform, release automatique |

---

## Architecture

### Structure du monorepo

```
focus-shield/
├── apps/
│   ├── desktop/                 # App Tauri (UI React + Backend Rust)
│   │   ├── src/                 # Frontend React
│   │   ├── src-tauri/           # Backend Rust + config Tauri
│   │   └── package.json
│   │
│   ├── browser-extension/       # Extension Chrome/Firefox (Manifest V3)
│   │   ├── src/
│   │   │   ├── background/      # Service worker (interception requêtes)
│   │   │   ├── content/         # Scripts injectés dans les pages
│   │   │   ├── popup/           # UI popup React
│   │   │   └── blocked/         # Page de blocage custom
│   │   ├── manifest.json
│   │   └── package.json
│   │
│   ├── web/                     # Dashboard web (Next.js, optionnel)
│   │   └── package.json
│   │
│   └── sync-server/             # Serveur de sync (NestJS, optionnel)
│       └── package.json
│
├── packages/
│   ├── session-engine/          # Logique pure des sessions (state machine, timers)
│   ├── blocker-core/            # Logique de blocage (domain matching, process matching)
│   ├── crypto/                  # Génération tokens, hashing, chiffrement master key
│   ├── storage/                 # Couche de persistance SQLite (sessions, stats, config)
│   ├── shared-types/            # Types TypeScript partagés entre tous les packages
│   └── ui-components/           # Composants React réutilisables
│
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### Communication entre composants

```
┌──────────────────────────────────────────────┐
│                  Tauri App                    │
│  ┌──────────┐    IPC     ┌─────────────────┐ │
│  │  React   │ ◄────────► │  Rust Backend   │ │
│  │   UI     │            │  (main process) │ │
│  └──────────┘            └────────┬────────┘ │
│                                   │          │
│                            ┌──────▼───────┐  │
│                            │   Daemon     │  │
│                            │  (sidecar)   │  │
│                            │ - hosts mgr  │  │
│                            │ - proc mgr   │  │
│                            └──────┬───────┘  │
└───────────────────────────────────┼──────────┘
                                    │ Native Messaging / WebSocket
                      ┌─────────────▼──────────────┐
                      │    Browser Extension        │
                      │  - request interception     │
                      │  - blocked page redirect    │
                      └─────────────┬──────────────┘
                                    │ REST API (optionnel)
                      ┌─────────────▼──────────────┐
                      │    Sync Server (NestJS)     │
                      │  - multi-device sync        │
                      │  - accountability features  │
                      └────────────────────────────┘
```

### Protocoles de communication

- **Tauri UI ↔ Rust backend** : Tauri IPC (invoke commands)
- **Rust backend ↔ Daemon sidecar** : Unix socket (Linux/Mac) / Named pipe (Windows)
- **Desktop ↔ Extension navigateur** : Chrome Native Messaging API ou WebSocket localhost
- **Desktop ↔ Sync server** : REST API + WebSocket pour events real-time

---

## Features

### F1 — Session Engine

Le moteur de sessions est le cœur de l'application. Il gère le cycle de vie complet des sessions de focus.

#### F1.1 — Types de sessions

- **Simple** : bloc focus unique avec durée fixe
- **Pomodoro** : alternance focus/break avec compteur de cycles (ex: 4 × [25min focus → 5min break] → 15min long break)
- **Custom sequence** : chaîne libre de blocs configurables
- **Timeboxed** : plage horaire fixe sans structure interne (ex: "9h-12h = focus")
- **Progressive** : commence souple (notifications bloquées) puis escalade vers blocage total

#### F1.2 — Presets prédéfinis

| Preset | Configuration |
|--------|--------------|
| 🍅 Pomodoro Classic | 4 × [25min focus → 5min break] → 15min long break |
| 🧠 Deep Work | 90min focus → 20min break |
| ⚡ Sprint | 45min focus → 10min break |
| 📚 Study Session | 50min focus → 10min break |
| 🌊 Flow State | 120min focus → 30min break |
| 🎯 Quick Task | 15min focus unique, pas de break |
| 🔥 Marathon | 180min focus → 30min break |

#### F1.3 — Scheduling

- Programmer des sessions récurrentes (quotidiennes, jours de semaine, custom)
- Auto-start à heure définie
- Intégration calendrier pour éviter les conflits

#### F1.4 — Fonctions avancées

- Extension à chaud : prolonger une session sans la relancer
- Pause intelligente : pause auto quand le PC se verrouille, reprise automatique
- Session linking : lier une session à un projet/tâche spécifique
- Focus score : score composite basé sur les tentatives de distraction, durée réelle vs planifiée, etc.

#### F1.5 — State machine

```
IDLE
  → SCHEDULED
  → STARTING (countdown 3-2-1 + affichage MDP)
    → FOCUS_ACTIVE
      → BREAK_TRANSITION (notification "break dans 1 min")
        → BREAK_ACTIVE
          → FOCUS_TRANSITION → FOCUS_ACTIVE (cycle)
      → UNLOCK_REQUESTED
        → COOLDOWN_WAITING (si niveau ≥ 3)
          → PASSWORD_ENTRY
            → UNLOCK_FAILED → FOCUS_ACTIVE (après X tentatives)
            → UNLOCKED (session terminée, loggé)
      → PAUSED (si le preset l'autorise)
    → COMPLETED
      → REVIEW (résumé post-session)
        → IDLE
```

---

### F2 — Système de verrouillage

Le système de verrouillage empêche l'utilisateur de désactiver le blocage impulsivement. La friction est configurable.

#### F2.1 — Génération du token de session

- Au lancement, génération d'un token unique (string aléatoire)
- Affiché **une seule fois** avec countdown de 10 secondes avant disparition
- L'utilisateur doit le noter physiquement s'il veut pouvoir unlock
- Le token est hashé (Argon2) côté app — impossible à retrouver après disparition

#### F2.2 — Niveaux de friction

| Niveau | Nom | Longueur MDP | Copier-coller | Conditions supplémentaires |
|--------|-----|-------------|---------------|---------------------------|
| 1 | Gentle | 8 chars alphanumériques | Autorisé | Aucune |
| 2 | Moderate | 16 chars mixtes | Interdit | Aucune |
| 3 | Strict | 32 chars mixtes + symboles | Interdit | Cooldown 60s avant saisie |
| 4 | Hardcore | 48 chars | Interdit | Cooldown 120s + double saisie |
| 5 | Nuclear | Aucun MDP | N/A | Session non interruptible |

#### F2.3 — Mécanismes anti-triche

- Détection de paste dans le champ de saisie (y compris via JS injection)
- Rate limiting : 3 tentatives ratées = cooldown de 5 minutes
- Champ de saisie avec masquage des caractères (toggle show/hide)
- Input keyboard-only (blocage des outils d'auto-type)

#### F2.4 — Emergency override

- Code maître défini à l'installation, chiffré AES-256
- Utilisation loggée et visible dans le dashboard
- Option accountability : notification envoyée au buddy en cas d'utilisation
- Option penalty : utiliser l'override reset le streak + tag "override" dans les stats

#### F2.5 — Unlock alternatifs (idées avancées)

- **Task-based unlock** : résoudre un calcul mental ou taper un paragraphe sans erreur
- **Time-delayed unlock** : demande de unlock, effectif dans 10 minutes (temps de reconsidérer)
- **Progressive unlock** : débloquer un seul site pour 5 minutes max sans terminer la session
- **Reflection prompt** : "Qu'est-ce que tu veux faire sur ce site ? Est-ce que ça peut attendre 20 minutes ?"

---

### F3 — Système de blocage

Le blocage opère sur trois niveaux pour une couverture maximale.

#### F3.1 — Blocage navigateur (Extension)

- Interception des requêtes via `declarativeNetRequest` (Manifest V3)
- Redirect vers page de blocage custom hébergée par l'extension
- Support des patterns : `*.reddit.com`, `youtube.com/shorts/*`, `twitter.com`
- Détection du mode incognito : demande de permission, warning si refusée
- Optionnel : blocage des recherches Google contenant certains mots-clés

#### F3.2 — Blocage DNS / Hosts

- Modification du fichier hosts (`/etc/hosts` ou `C:\Windows\System32\drivers\etc\hosts`)
- Redirection des domaines bloqués vers `127.0.0.1`
- Nécessite des privilèges admin → daemon avec droits élevés
- Avantage : bloque tous les navigateurs + apps faisant des requêtes HTTP
- Rollback automatique du fichier hosts en fin de session ou crash

#### F3.3 — Blocage de process

- Monitoring des process running via API OS
- Mode doux : SIGSTOP/SIGCONT (suspend/resume, pas de perte de données)
- Mode dur : kill du process
- Watcher qui empêche le relancement (re-kill si respawn)
- Mapping configurable des process par application

#### F3.4 — Listes de blocage prédéfinies

**Social Media** :
- Domaines : `*.facebook.com`, `*.instagram.com`, `*.twitter.com`, `*.x.com`, `*.tiktok.com`, `*.snapchat.com`, `*.linkedin.com/feed/*`
- Process : `discord`, `slack`, `telegram`, `whatsapp`

**Entertainment** :
- Domaines : `*.youtube.com`, `*.netflix.com`, `*.twitch.tv`, `*.spotify.com`, `*.reddit.com`, `*.9gag.com`
- Process : `spotify`, `vlc`

**Gaming** :
- Domaines : `*.steampowered.com`, `*.epicgames.com`, `*.riotgames.com`
- Process : `steam`, `epicgameslauncher`, `battle.net`, `riot*`

**News** :
- Domaines : `*.cnn.com`, `*.bbc.com`, `*.lemonde.fr`, `*.lefigaro.fr`, `news.google.com`, `news.ycombinator.com`

**Shopping** :
- Domaines : `*.amazon.com`, `*.amazon.fr`, `*.ebay.com`, `*.aliexpress.com`, `*.leboncoin.fr`, `*.vinted.fr`

#### F3.5 — Granularité fine

- Bloquer YouTube mais autoriser des chaînes spécifiques
- Bloquer Reddit mais autoriser certains subreddits (ex: `r/learnprogramming`)
- Allowlist par domaine ou par pattern
- Time-based allowlist : sites autorisés à certaines heures même en session
- Quota-based : "Reddit autorisé 10 minutes par session, puis bloqué"

#### F3.6 — Page de blocage

Quand l'utilisateur tente d'accéder à un site bloqué, affichage d'une page custom contenant :
- Message personnalisable (ex: "Tu bosses sur ton mémoire, reste focus")
- Citation motivante random (pool configurable)
- Timer montrant le temps restant de la session
- Compteur de tentatives bloquées dans la session en cours
- Bouton "Retour au travail" (pas de lien vers le site bloqué)
- Optionnel : mini exercice de respiration de 30 secondes

---

### F4 — Dashboard & Analytics

#### F4.1 — Métriques trackées

- Temps total en focus par jour/semaine/mois
- Nombre de sessions complétées vs abandonnées
- Nombre de tentatives de distraction bloquées
- Sites/apps les plus tentés pendant le focus
- Ratio focus/slack quotidien
- Peak focus hours (heure la plus productive de la journée)
- Durée moyenne de focus avant première tentative de distraction
- Score de focus par session (composite)

#### F4.2 — Visualisations

- **Heatmap annuelle** : style GitHub contributions, intensité de focus par jour
- **Timeline journalière** : barre horizontale des blocs focus/break/idle
- **Graphe de tendance** : évolution du temps de focus sur 30/90 jours
- **Radar chart** : répartition des catégories de distraction
- **Streaks counter** : jours consécutifs avec objectif atteint

#### F4.3 — Rapports

- Résumé hebdomadaire automatique (notification ou email si sync server)
- Export CSV/JSON des données brutes
- Rapport mensuel avec insights (ex: "Tu es 23% plus productif le mardi matin")

#### F4.4 — Objectifs

- Objectif quotidien de focus configurable (ex: 4h/jour)
- Objectifs hebdomadaires et mensuels
- Suivi de progression visuel

---

### F5 — Gamification

#### F5.1 — Streaks

- Compteur de jours consécutifs avec session complétée
- Milestones : 7, 30, 100, 365 jours
- Freeze configurable : 1 jour de pause autorisé par semaine sans casser le streak

#### F5.2 — Achievements

| Achievement | Condition |
|-------------|-----------|
| First Focus | Première session complétée |
| Iron Will | 10 sessions Hardcore sans override |
| Early Bird | Session commencée avant 7h |
| Night Owl | Session complétée après 23h |
| Marathon | Session de 3h+ sans interruption |
| Zero Temptation | Session sans aucune tentative de distraction |
| Comeback Kid | Reprendre après 7 jours d'inactivité |
| Century | 100 sessions complétées |
| Deep Diver | 50h cumulées en mode Deep Work |

#### F5.3 — Système de niveaux

- XP gagnée par session (proportionnelle à durée × niveau de difficulté)
- Niveaux débloquant des thèmes visuels pour la page de blocage
- Purement cosmétique, pas de pay-to-win

#### F5.4 — Accountability social

- Inviter un "focus buddy"
- Voir le statut de l'autre ("en focus depuis 45 min")
- Notification si le buddy utilise un emergency override
- Challenge mode : classement hebdomadaire d'heures de focus
- Mode groupe : sessions synchronisées (virtual coworking)

---

### F6 — Configuration & Profils

#### F6.1 — Multi-profils

- Profils contextuels : "Work", "Study", "Personal project"
- Chaque profil possède sa propre blocklist, ses presets, ses objectifs
- Switch rapide entre profils

#### F6.2 — Import / Export

- Export des presets et config en JSON
- Partage de preset via lien ou QR code
- Optionnel : marketplace communautaire de presets

#### F6.3 — Notifications configurables

- Notification de début/fin de bloc
- Rappel à mi-session
- Notification de tentative de distraction
- Morning intention : "Quel est ton objectif focus aujourd'hui ?"

---

### F7 — Sécurité & Anti-contournement

> Philosophie : Focus Shield est un outil d'autodiscipline, pas un parental control. Le but est de créer assez de friction pour que le "moi impulsif" abandonne.

#### F7.1 — Mesures

- Daemon tourne en service système (survit au kill de l'app desktop)
- Extension active en mode incognito si autorisé
- Détection de désinstallation de l'extension → notification desktop
- Rollback propre du fichier hosts en cas de crash (watchdog)
- Tokens hashés avec Argon2, jamais stockés en clair
- Master key chiffré AES-256 avec clé dérivée du password système

---

## Modèles de données

### Session

```typescript
interface Session {
  id: string;
  name: string;
  blocks: SessionBlock[];
  lockLevel: 1 | 2 | 3 | 4 | 5;
  blocklist: string; // ID du BlocklistPreset ou "custom"
  customBlocklist?: BlockRule[];
  allowlist?: string[];
  repeat?: RepeatConfig;
  autoStart: boolean;
  profileId: string;
  notifications: NotificationConfig;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionBlock {
  type: 'focus' | 'break' | 'deep_focus';
  duration: number; // minutes
  blockingEnabled: boolean;
  allowedDuringBreak?: string[];
}

interface RepeatConfig {
  pattern: 'daily' | 'weekdays' | 'weekends' | 'custom';
  days?: number[]; // 0-6, 0 = dimanche
  time: string; // "HH:mm"
  autoStart: boolean;
}

interface NotificationConfig {
  onBlockStart: boolean;
  onBlockEnd: boolean;
  halfwayReminder: boolean;
  onAttemptedDistraction: boolean;
}
```

### Blocklist

```typescript
interface BlocklistPreset {
  id: string;
  name: string;
  icon: string;
  category: 'social' | 'gaming' | 'entertainment' | 'news' | 'shopping' | 'custom';
  domains: DomainRule[];
  processes: ProcessRule[];
  isBuiltIn: boolean;
  createdAt: Date;
}

interface DomainRule {
  pattern: string; // ex: "*.reddit.com", "youtube.com/shorts/*"
  type: 'block' | 'allow';
}

interface ProcessRule {
  name: string; // ex: "discord"
  aliases: string[]; // ex: ["Discord.exe", "discord-ptb"]
  action: 'kill' | 'suspend';
}
```

### Session Run (instance d'exécution)

```typescript
interface SessionRun {
  id: string;
  sessionId: string;
  profileId: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed' | 'aborted' | 'overridden';
  currentBlockIndex: number;
  tokenHash: string; // Hash Argon2 du token généré
  distractionAttempts: DistractionAttempt[];
  unlockAttempts: UnlockAttempt[];
  focusScore?: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
}

interface DistractionAttempt {
  timestamp: Date;
  type: 'domain' | 'process';
  target: string; // domaine ou nom du process
  blocked: boolean;
}

interface UnlockAttempt {
  timestamp: Date;
  method: 'token' | 'master_key' | 'emergency';
  success: boolean;
}
```

### Profil

```typescript
interface Profile {
  id: string;
  name: string;
  icon: string;
  defaultLockLevel: 1 | 2 | 3 | 4 | 5;
  defaultBlocklists: string[];
  dailyFocusGoal: number; // minutes
  weeklyFocusGoal: number; // minutes
  createdAt: Date;
}
```

### Stats agrégées

```typescript
interface DailyStats {
  date: string; // "YYYY-MM-DD"
  profileId: string;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  sessionsCompleted: number;
  sessionsAborted: number;
  distractionAttempts: number;
  topDistractors: { target: string; count: number }[];
  averageFocusScore: number;
  streakDay: number;
}
```

### Gamification

```typescript
interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalSessionsCompleted: number;
  totalFocusHours: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number; // 0-100 pour les achievements progressifs
}
```

---

## Épics & Issues

### Epic 1 — Initialisation du projet

- [ ] **E1-001** : Init monorepo pnpm + Turborepo avec structure de dossiers
- [ ] **E1-002** : Configuration TypeScript partagée (tsconfig.base.json)
- [ ] **E1-003** : Setup ESLint + Prettier avec config partagée
- [ ] **E1-004** : Init app Tauri 2.0 avec React + Tailwind
- [ ] **E1-005** : Init extension navigateur Manifest V3 avec scaffolding React
- [ ] **E1-006** : Créer le package `shared-types` avec tous les types de base
- [ ] **E1-007** : Setup Vitest pour les packages
- [ ] **E1-008** : Setup GitHub Actions CI (lint, type-check, test, build)
- [ ] **E1-009** : Créer le README.md et CONTRIBUTING.md du projet

### Epic 2 — Session Engine (package `session-engine`)

- [ ] **E2-001** : Implémenter la state machine des sessions (IDLE → STARTING → FOCUS → BREAK → COMPLETED)
- [ ] **E2-002** : Implémenter le timer avec précision (compensation de drift)
- [ ] **E2-003** : Support des presets prédéfinis (Pomodoro, Deep Work, Sprint, etc.)
- [ ] **E2-004** : Support des sessions custom (séquence libre de blocs)
- [ ] **E2-005** : Système de scheduling (sessions récurrentes, auto-start)
- [ ] **E2-006** : Extension à chaud (prolonger une session en cours)
- [ ] **E2-007** : Pause intelligente (détection verrouillage PC)
- [ ] **E2-008** : Calcul du focus score par session
- [ ] **E2-009** : Tests unitaires complets du session engine
- [ ] **E2-010** : Support des sessions progressives (escalade de blocage)

### Epic 3 — Système de verrouillage (package `crypto`)

- [ ] **E3-001** : Générateur de tokens aléatoires (configurable par niveau de friction)
- [ ] **E3-002** : Hashing Argon2 des tokens
- [ ] **E3-003** : Validation de token avec rate limiting (3 essais → cooldown 5 min)
- [ ] **E3-004** : Gestion du master key (génération, chiffrement AES-256, stockage sécurisé)
- [ ] **E3-005** : Système de cooldown avant saisie (niveaux 3-4)
- [ ] **E3-006** : Logique anti-copier-coller pour le champ de saisie
- [ ] **E3-007** : Time-delayed unlock (demande → délai de 10 min → activation)
- [ ] **E3-008** : Task-based unlock (calcul mental ou saisie de texte)
- [ ] **E3-009** : Logging des tentatives d'unlock et overrides
- [ ] **E3-010** : Tests unitaires du module crypto

### Epic 4 — Blocage navigateur (Extension)

- [ ] **E4-001** : Scaffolding extension Manifest V3 (background service worker, popup, content scripts)
- [ ] **E4-002** : Interception de requêtes via `declarativeNetRequest` avec rules dynamiques
- [ ] **E4-003** : Pattern matching de domaines (wildcard, path-based)
- [ ] **E4-004** : Page de blocage custom (message, citation, timer, compteur)
- [ ] **E4-005** : Popup de l'extension (mini timer, quick start, toggle)
- [ ] **E4-006** : Communication avec l'app desktop via Native Messaging API
- [ ] **E4-007** : Fallback communication via WebSocket localhost
- [ ] **E4-008** : Détection et gestion du mode incognito
- [ ] **E4-009** : Pool de citations motivantes configurable
- [ ] **E4-010** : Build pipeline pour Chrome et Firefox
- [ ] **E4-011** : Support de l'allowlist granulaire (certaines pages d'un domaine bloqué)

### Epic 5 — Blocage système (Daemon Rust)

- [ ] **E5-001** : Sidecar Rust dans Tauri — setup et communication IPC
- [ ] **E5-002** : Module hosts manager : lecture/écriture sécurisée du fichier hosts
- [ ] **E5-003** : Rollback automatique du fichier hosts (watchdog + cleanup on crash)
- [ ] **E5-004** : Gestion des privilèges admin (élévation de droits, UAC Windows)
- [ ] **E5-005** : Module process monitor : lister et identifier les process running
- [ ] **E5-006** : Process blocking mode doux (SIGSTOP/SIGCONT sur Unix, SuspendThread sur Windows)
- [ ] **E5-007** : Process blocking mode dur (kill + watcher anti-respawn)
- [ ] **E5-008** : Mapping configurable process ↔ application
- [ ] **E5-009** : Service système persistant (survit au kill de l'app desktop)
- [ ] **E5-010** : Tests d'intégration blocage hosts + process
- [ ] **E5-011** : Support cross-platform (Linux, macOS, Windows)

### Epic 6 — Interface Desktop (Tauri + React)

- [ ] **E6-001** : Layout principal avec navigation (sidebar ou tabs)
- [ ] **E6-002** : Écran Home / Dashboard (status, quick start, stats du jour, streak)
- [ ] **E6-003** : Écran de session en cours (timer circulaire, progression, compteur distractions)
- [ ] **E6-004** : Écran de lancement de session (choix preset, affichage token, countdown)
- [ ] **E6-005** : Écran de configuration des presets (CRUD)
- [ ] **E6-006** : Écran de gestion des blocklists (catégories, custom rules, allowlist)
- [ ] **E6-007** : Écran de scheduling (calendrier, sessions récurrentes)
- [ ] **E6-008** : Écran Analytics (heatmap, tendances, radar, timeline)
- [ ] **E6-009** : Écran Settings (lock level, master key, notifications, thème)
- [ ] **E6-010** : Composant PasswordInput anti-triche (no paste, masquage, rate limiting UI)
- [ ] **E6-011** : Composant de review post-session (résumé, score, feedback)
- [ ] **E6-012** : System tray icon avec mini menu (status, quick actions)
- [ ] **E6-013** : Notifications système natives (via Tauri notification API)
- [ ] **E6-014** : Thème dark/light avec persistance du choix
- [ ] **E6-015** : Multi-profils : UI de switch et gestion

### Epic 7 — Storage & Persistance (package `storage`)

- [ ] **E7-001** : Setup SQLite via Tauri SQL plugin
- [ ] **E7-002** : Schéma de la base de données (tables sessions, runs, stats, config, achievements)
- [ ] **E7-003** : Système de migrations (versioning du schéma)
- [ ] **E7-004** : CRUD sessions et presets
- [ ] **E7-005** : CRUD blocklists et profils
- [ ] **E7-006** : Enregistrement des session runs et tentatives de distraction
- [ ] **E7-007** : Agrégation des stats quotidiennes/hebdomadaires/mensuelles
- [ ] **E7-008** : Export de données (CSV, JSON)
- [ ] **E7-009** : Tests d'intégration de la couche storage

### Epic 8 — Gamification

- [ ] **E8-001** : Système de streaks (calcul, freeze, reset)
- [ ] **E8-002** : Système d'XP et de niveaux
- [ ] **E8-003** : Catalogue d'achievements avec conditions de déverrouillage
- [ ] **E8-004** : Tracking de progression des achievements
- [ ] **E8-005** : UI achievements et niveaux dans le dashboard
- [ ] **E8-006** : Thèmes visuels débloquables pour la page de blocage
- [ ] **E8-007** : Notifications d'achievements débloqués

### Epic 9 — Social & Accountability (optionnel)

- [ ] **E9-001** : Setup serveur NestJS avec PostgreSQL pour la sync
- [ ] **E9-002** : Authentification (magic link ou simple token)
- [ ] **E9-003** : API de sync des sessions et stats entre devices
- [ ] **E9-004** : Système de buddy (invitation, liaison de comptes)
- [ ] **E9-005** : Partage de status en temps réel (WebSocket)
- [ ] **E9-006** : Notifications buddy (override, streak cassé)
- [ ] **E9-007** : Challenge mode (leaderboard hebdomadaire)
- [ ] **E9-008** : Sessions synchronisées (virtual coworking)
- [ ] **E9-009** : Rapports hebdomadaires automatiques par email
- [ ] **E9-010** : Docker Compose pour le self-hosting du serveur

### Epic 10 — Qualité & Release

- [ ] **E10-001** : Tests E2E avec Playwright (flows critiques)
- [ ] **E10-002** : Build multi-platform (Linux, macOS, Windows) via GitHub Actions
- [ ] **E10-003** : Auto-update via Tauri updater
- [ ] **E10-004** : Packaging de l'extension pour Chrome Web Store et Firefox Add-ons
- [ ] **E10-005** : Documentation utilisateur (guide de démarrage, FAQ)
- [ ] **E10-006** : Landing page du projet
- [ ] **E10-007** : Système de crash reporting et telemetry opt-in
- [ ] **E10-008** : Performance profiling (mémoire daemon, CPU watcher)

---

## Roadmap

### Phase 1 — MVP (4-6 semaines)

**Objectif** : App desktop fonctionnelle avec sessions basiques et blocage navigateur.

Épics concernés : E1 (complet), E2 (E2-001 à E2-004), E3 (E3-001 à E3-003), E4 (E4-001 à E4-005), E6 (E6-001 à E6-005), E7 (E7-001 à E7-005)

Livrables :
- Monorepo initialisé avec CI
- Session engine avec timer et presets Pomodoro/custom
- Extension navigateur avec blocage de domaines et page de blocage
- App desktop avec UI de lancement/suivi de session
- Système de token avec niveaux 1-3
- Stockage SQLite local

### Phase 2 — Blocage système (3-4 semaines)

**Objectif** : Blocage au niveau OS pour une couverture complète.

Épics concernés : E5 (complet), E4 (E4-006 à E4-008), E2 (E2-005 à E2-007), E3 (E3-004 à E3-006)

Livrables :
- Daemon Rust avec blocage hosts et process
- Communication desktop ↔ extension
- Scheduling et sessions récurrentes
- Master key et niveaux de friction 4-5

### Phase 3 — Analytics & Gamification (3-4 semaines)

**Objectif** : Dashboard complet et système de motivation.

Épics concernés : E6 (E6-008 à E6-015), E7 (E7-006 à E7-009), E8 (complet)

Livrables :
- Dashboard analytics avec tous les graphiques
- Streaks, achievements, niveaux
- Multi-profils
- Export de données
- Page de blocage enrichie avec thèmes

### Phase 4 — Social & Sync (4-6 semaines)

**Objectif** : Features sociales et synchronisation multi-devices.

Épics concernés : E9 (complet), E10 (complet)

Livrables :
- Serveur NestJS self-hosted avec Docker
- Sync multi-devices
- Accountability buddy et challenges
- Build multi-platform et auto-update
- Documentation et landing page

---

## Conventions

### Git

- **Branches** : `main` (stable), `develop` (intégration), `feature/E{epic}-{issue}-{description}`, `fix/...`
- **Commits** : Conventional Commits — `feat(session-engine): add pomodoro preset support`
- **PRs** : Liées aux issues GitHub, review requise, CI verte obligatoire

### Code

- TypeScript strict mode partout
- ESLint + Prettier avec config partagée
- Tests unitaires pour les packages, E2E pour les apps
- Nommage : camelCase pour les variables/fonctions, PascalCase pour les types/composants

### Issues GitHub

- Préfixées par le code Epic : `[E2-003] Support des presets prédéfinis`
- Labels : `epic:session-engine`, `epic:blocker`, `epic:ui`, `priority:high`, `phase:mvp`, etc.
- Milestones alignés sur les phases de la roadmap

### Releases

- Versioning SemVer : `MAJOR.MINOR.PATCH`
- Changelog automatique depuis les conventional commits
- Release notes sur GitHub Releases
