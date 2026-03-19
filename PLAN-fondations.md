# Plan de solidification — Focus Shield

> Les fondations d'abord, les features ensuite.
> Chaque phase doit être **stable** (build + tests + lint) avant de passer à la suivante.

---

## Diagnostic

| Problème | Sévérité | État actuel |
|----------|----------|-------------|
| Timer frontend-only | CRITIQUE | `setInterval` React, aucun timer Rust |
| SHA-256 au lieu d'Argon2 | HAUTE | Package `crypto` avec Argon2 existe mais jamais importé |
| Aucune persistance SQLite | HAUTE | Package `storage` complet + tests, jamais branché |
| Erreurs silencieuses | MOYENNE | 5 `catch {}` avalent les erreurs sans feedback user |
| Stats mockées en dur | MOYENNE | Dashboard affiche "127 min" en dur, jamais mis à jour |
| 0 commande session côté Rust | HAUTE | 8 commandes daemon, 0 commande session/timer/stats |

---

## Phase 1 — Timer autoritatif Rust (CRITIQUE)

**Objectif** : Le timer tourne côté Rust. React est un affichage, pas l'horloge.

### 1.1 Commandes Tauri session

Créer `src-tauri/src/commands/session_commands.rs` :

```
session_start(config) → SessionRun     # Démarre le timer Rust, retourne l'ID
session_stop(run_id) → Result          # Arrête proprement
session_pause(run_id) → Result         # Pause (si le preset l'autorise)
session_resume(run_id) → Result        # Reprise
session_status() → SessionState        # État courant (phase, temps restant, etc.)
session_unlock(run_id, token) → Result # Vérifie le token côté Rust
```

### 1.2 Timer Rust avec événements Tauri

- Timer `tokio::time::interval` dans un task Rust
- Émet `session:tick` via `app.emit()` chaque seconde → React écoute
- Émet `session:phase_changed` sur les transitions (focus → break → focus...)
- Émet `session:completed` en fin de session

### 1.3 Refactor du store React

- `session-store.ts` devient un **miroir** du state Rust
- Supprime `tick()`, `timeRemainingMs - 1000` et le `setInterval`
- Remplace par `listen('session:tick', callback)` de Tauri
- Les actions appellent les commandes IPC (`session_start`, `session_stop`, etc.)

### 1.4 Tests

- Tests unitaires Rust pour le timer (drift compensation)
- Tests unitaires Rust pour la state machine
- Vérifier que React reflète fidèlement le state Rust

**Fichiers touchés** :
- `apps/desktop/src-tauri/src/commands/session_commands.rs` (nouveau)
- `apps/desktop/src-tauri/src/lib.rs` (enregistrer les commandes)
- `apps/desktop/src/stores/session-store.ts` (refactor majeur)
- `apps/desktop/src/hooks/useTimer.ts` (remplacer par listener Tauri)
- `apps/desktop/src/tauri/session.ts` (nouveau — wrappers typés IPC)

---

## Phase 2 — Crypto réel (Argon2)

**Objectif** : Utiliser le package `@focus-shield/crypto` qui existe déjà et est testé.

### 2.1 Brancher Argon2 côté Rust

Le hashing doit tourner côté Rust (Argon2 est CPU-intensif, pas adapté au browser) :

- Ajouter la crate `argon2` dans `Cargo.toml`
- Commande IPC `crypto_hash_token(token) → hash`
- Commande IPC `crypto_verify_token(token, hash) → bool`
- Rate limiting côté Rust (3 tentatives → cooldown 5 min)

### 2.2 Supprimer SHA-256 du frontend

- Supprimer `sha256()` de `session-store.ts`
- La vérification du token passe par IPC → Rust vérifie avec Argon2
- Le token hash n'est plus stocké dans Zustand (il est dans le state Rust)

### 2.3 Anti-triche renforcé

- Le cooldown est géré côté Rust (pas contournable via DevTools)
- Le rate limiting est persisté (résiste au refresh)
- Le token n'est jamais envoyé en clair au frontend après les 10s d'affichage

**Fichiers touchés** :
- `apps/desktop/src-tauri/src/commands/crypto_commands.rs` (nouveau)
- `apps/desktop/src-tauri/Cargo.toml` (ajouter `argon2`)
- `apps/desktop/src/stores/session-store.ts` (supprimer sha256)
- `apps/desktop/src/pages/SessionsPage.tsx` (appel IPC pour vérif)

---

## Phase 3 — Persistance SQLite

**Objectif** : Brancher le package `@focus-shield/storage` (déjà écrit et testé) dans l'app.

### 3.1 Commandes CRUD côté Rust

Créer `src-tauri/src/commands/storage_commands.rs` :

```
storage_save_session_run(run) → Result
storage_get_session_runs(filter) → Vec<SessionRun>
storage_save_distraction(attempt) → Result
storage_get_daily_stats(date) → DailyStats
storage_get_stats_range(from, to) → Vec<DailyStats>
storage_export_data(format) → String   # CSV ou JSON
```

### 3.2 Initialisation de la DB

- Au démarrage de l'app Tauri, initialiser SQLite via `tauri-plugin-sql`
- Lancer les migrations automatiquement
- Chemin : `app_data_dir()/focus-shield.db`

### 3.3 Brancher les stores

- `session-store.ts` : sauvegarder chaque `SessionRun` à la fin d'une session
- `session-store.ts` : enregistrer chaque tentative de distraction
- Supprimer `MOCK_TODAY_STATS` — calculer à partir de la DB
- `todayStats` chargé depuis SQLite au démarrage

### 3.4 Dashboard réel

- Supprimer `data/mock-analytics.ts`
- Brancher les composants analytics sur les données SQLite
- Heatmap, tendances, radar chart → tous alimentés par des vraies données

**Fichiers touchés** :
- `apps/desktop/src-tauri/src/commands/storage_commands.rs` (nouveau)
- `apps/desktop/src-tauri/src/db/` (nouveau — init, migrations)
- `apps/desktop/src/stores/session-store.ts` (persistance)
- `apps/desktop/src/stores/stats-store.ts` (nouveau — remplace les mocks)
- `apps/desktop/src/data/mock-analytics.ts` (supprimer)
- `apps/desktop/src/components/dashboard/` (brancher sur data réelle)

---

## Phase 4 — Gestion d'erreurs visible

**Objectif** : L'utilisateur sait toujours ce qui marche et ce qui ne marche pas.

### 4.1 Système de notifications

- Créer un `useNotificationStore` avec toast queue
- Composant `<ToastContainer />` dans `App.tsx`
- 3 niveaux : `info`, `warning`, `error`

### 4.2 Remplacer les catch silencieux

| Catch actuel | Remplacement |
|-------------|-------------|
| `activateBlocking` catch vide | Toast warning : "Blocage système indisponible. Le blocage navigateur reste actif." |
| `deactivateBlocking` catch vide | Toast info : "Le daemon n'a pas répondu. Le blocage sera nettoyé au prochain démarrage." |
| localStorage parse catches | Fallback silencieux OK (c'est de la config, pas critique) |

### 4.3 Indicateur de statut daemon

- Badge dans la sidebar : vert (daemon connecté), orange (extension seule), rouge (rien)
- L'utilisateur sait à quel niveau de protection il est

**Fichiers touchés** :
- `apps/desktop/src/stores/notification-store.ts` (nouveau)
- `apps/desktop/src/components/ui/ToastContainer.tsx` (nouveau)
- `apps/desktop/src/stores/session-store.ts` (remplacer catch vides)
- `apps/desktop/src/components/layout/Sidebar.tsx` (indicateur daemon)

---

## Phase 5 — Intégration end-to-end

**Objectif** : Tout est connecté. Une session démarre côté Rust, persiste dans SQLite, s'affiche dans React.

### 5.1 Flux complet

```
User clique "Start" dans React
  → IPC session_start() → Rust crée le timer + hash le token avec Argon2
    → Rust sauvegarde SessionRun dans SQLite
    → Rust active le blocage via daemon
    → Rust émet session:tick chaque seconde → React affiche

User visite Instagram
  → Extension bloque → rapporte au daemon → Rust enregistre distraction dans SQLite

User veut arrêter
  → IPC session_unlock(token) → Rust vérifie avec Argon2 (rate limited)
    → Si OK : Rust arrête le timer, désactive le blocage, finalise le SessionRun
    → Rust calcule le focus score, met à jour les stats
    → Rust émet session:completed → React affiche le review

Au redémarrage
  → Rust charge les stats depuis SQLite → React affiche le vrai dashboard
```

### 5.2 Tests E2E de la chaîne complète

- Test Playwright : start session → vérifier timer → visiter site bloqué → vérifier blocked page → arrêter session → vérifier stats persistées

---

## Ordre d'exécution

```
Phase 1 — Timer Rust         ████████████████░░░░  ~3-4 jours
Phase 2 — Argon2             ██████░░░░░░░░░░░░░░  ~1-2 jours
Phase 3 — SQLite             ████████████░░░░░░░░  ~2-3 jours
Phase 4 — Error handling     ████░░░░░░░░░░░░░░░░  ~1 jour
Phase 5 — Intégration E2E    ████████░░░░░░░░░░░░  ~2 jours
                                                    ─────────
                                                    ~10-12 jours
```

## Règle absolue

**Aucune nouvelle feature** tant que ces 5 phases ne sont pas terminées et stables.

Les features gamification, buddy system, challenges, sync server — tout ça attend. Le produit n'a pas besoin de plus de features, il a besoin de **fondations qui ne mentent pas**.
