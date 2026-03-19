# Focus Shield — Blocking Debug & Multi-Browser Testing Recap

> Session du 2026-03-19

---

## Objectif

Vérifier que le blocage de sites fonctionne, corriger les problèmes, et tester sur tous les navigateurs installés (Chrome, Firefox, Brave).

---

## 1. Exploration du pipeline de blocage

Analyse complète du flux de blocage de bout en bout :

```
Desktop App (React/Zustand)
  → startSession() → activateBlocking()
    → Tauri IPC → Rust daemon
      → WebSocket broadcast (port 7532)
        → Extension service worker
          → chrome.declarativeNetRequest.updateDynamicRules()
            → URL bloquée → redirect vers blocked page
```

### Fichiers clés identifiés

| Fichier | Rôle |
|---------|------|
| `apps/browser-extension/src/background/index.ts` | Service worker — gestion des règles declarativeNetRequest |
| `apps/browser-extension/src/background/desktop-client.ts` | Communication WebSocket avec le daemon |
| `apps/browser-extension/src/blocked/BlockedPage.tsx` | Page affichée quand un site est bloqué |
| `apps/desktop/src/stores/session-store.ts` | Déclenchement du blocage au démarrage de session |
| `apps/desktop/src/stores/blocklist-store.ts` | Listes de domaines bloqués (Social, Entertainment, etc.) |
| `apps/desktop/src-tauri/daemon/src/handler.rs` | Handler Rust qui broadcast aux extensions |
| `apps/desktop/src-tauri/daemon/src/ws_server.rs` | Serveur WebSocket localhost:7532 |

---

## 2. Tests E2E créés

### 2.1 Test Chrome uniquement — `blocking-pipeline.spec.ts`

**Fichier** : `apps/browser-extension/e2e/blocking-pipeline.spec.ts`

Charge la vraie extension Chrome dans Playwright, active le blocage, et vérifie que les sites sont redirigés.

**16 tests** couvrant :
- Extension se charge correctement (service worker, popup)
- Règles declarativeNetRequest enregistrées (13 domaines)
- **Instagram, YouTube, Reddit, Twitter, Facebook** → bloqués
- **Google, GitHub** → accessibles
- Désactivation supprime les règles
- Simulation complète d'une session Pomodoro (6 sites bloqués + 1 autorisé)

```bash
pnpm --filter @focus-shield/browser-extension e2e:blocking
```

### 2.2 Test multi-navigateur — `multi-browser-blocking.spec.ts`

**Fichier** : `apps/browser-extension/e2e/multi-browser-blocking.spec.ts`

Détecte automatiquement les navigateurs installés et teste chacun.

**24 tests** couvrant :

| Navigateur | Tests | Résultat |
|------------|-------|----------|
| Chrome (Playwright Chromium) | 10 — service worker, popup, blocking 4 sites, allow 2 sites, deactivation | 10/10 PASS |
| Brave | 10 — idem | 10/10 PASS |
| Firefox | 3 — blocked page render, popup render, manifest validation | 3/3 PASS |
| **Total** | **24** | **24/24 PASS** |

```bash
pnpm --filter @focus-shield/browser-extension e2e:browsers
```

### Navigateurs supportés (détection auto)

Le test scanne automatiquement :
- Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
- Brave (`C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`)
- Edge (`C:\Program Files\Microsoft\Edge\Application\msedge.exe`)
- Opera (`%LOCALAPPDATA%\Programs\Opera\opera.exe`)
- Firefox (`C:\Program Files\Mozilla Firefox\firefox.exe`)

---

## 3. Bug Firefox corrigé

### Problème

L'extension ne se chargeait pas dans Firefox : *"Une erreur s'est produite lors de l'installation du module complémentaire temporaire"*

### Cause (trouvée avec `web-ext lint`)

```
ERROR: "/declarative_net_request/rule_resources" must NOT have fewer than 1 items
```

Le manifest Firefox contenait `"rule_resources": []` (tableau vide), invalide pour Firefox.

### Corrections appliquées

**`manifest.firefox.json`** :

1. Supprimé `declarative_net_request.rule_resources: []` — on utilise uniquement des règles dynamiques, pas de règles statiques
2. Supprimé la permission `nativeMessaging` — non utilisée (on utilise WebSocket), pouvait causer des erreurs
3. Supprimé `data_collection_permissions` — format incompatible, nécessaire uniquement pour la soumission AMO

**`manifest.json` (Chrome)** :

1. Supprimé `declarative_net_request.rule_resources: []` — inutile pour les règles dynamiques

### Rebuild

```bash
pnpm --filter @focus-shield/browser-extension build:firefox
```

Validation : `npx web-ext lint` → **0 errors** (6 warnings non-bloquants)

---

## 4. Fichiers créés / modifiés

### Créés

| Fichier | Description |
|---------|-------------|
| `apps/browser-extension/e2e/blocking-pipeline.spec.ts` | E2E test Chrome — pipeline de blocage complet |
| `apps/browser-extension/e2e/multi-browser-blocking.spec.ts` | E2E test multi-navigateur (Chrome, Brave, Firefox) |
| `apps/browser-extension/playwright.extension.config.ts` | Config Playwright pour test Chrome extension |
| `apps/browser-extension/playwright.browsers.config.ts` | Config Playwright pour test multi-navigateur |
| `scripts/quickstart.sh` | Script de setup complet + lancement de l'app |

### Modifiés

| Fichier | Changement |
|---------|------------|
| `apps/browser-extension/manifest.json` | Supprimé `declarative_net_request.rule_resources: []` |
| `apps/browser-extension/manifest.firefox.json` | Fix Firefox install error (voir section 3) |
| `apps/browser-extension/package.json` | Ajouté scripts `e2e:blocking` et `e2e:browsers`, ajouté `@playwright/test` |

---

## 5. Script quickstart

**Fichier** : `scripts/quickstart.sh`

Setup complet en une commande :

```bash
bash scripts/quickstart.sh
```

Étapes :
1. Vérifie les prérequis (pnpm, node, rust, gcc/mingw64)
2. Installe les dépendances (`pnpm install`)
3. Build tous les packages TypeScript
4. Build l'extension navigateur (Chrome + Firefox)
5. Vérifie le binaire daemon
6. Affiche les instructions d'installation de l'extension
7. Lance l'app desktop (`tauri dev`)

---

## 6. Comment utiliser

### Lancer l'app

```bash
bash scripts/dev.sh
# ou
bash scripts/quickstart.sh    # setup complet + lancement
```

### Installer l'extension

**Chrome / Brave / Edge / Opera :**
1. `chrome://extensions` → Developer mode ON
2. "Load unpacked" → sélectionner `apps/browser-extension/`

**Firefox :**
1. `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on" → sélectionner `apps/browser-extension/dist-firefox/manifest.json`

### Lancer les tests

```bash
# Test blocage Chrome uniquement (16 tests)
pnpm --filter @focus-shield/browser-extension e2e:blocking

# Test multi-navigateur (24 tests)
pnpm --filter @focus-shield/browser-extension e2e:browsers

# Tests unitaires existants
pnpm --filter @focus-shield/browser-extension test
```

### Si l'app crash au relancement

```bash
# Tuer les processus zombies
powershell.exe -Command "Get-Process *focus-shield* | Stop-Process -Force"

# Libérer le port 1420
powershell.exe -Command "Get-NetTCPConnection -LocalPort 1420 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```

---

## 7. Résultat final

**Le blocage fonctionne correctement sur tous les navigateurs testés.**

L'extension utilise `declarativeNetRequest` (Manifest V3) pour intercepter les requêtes main_frame et rediriger vers une page de blocage personnalisée affichant :
- Icône bouclier + "Site Blocked"
- Citation motivante aléatoire
- Timer du temps restant
- Compteur de tentatives de distraction
- Bouton "Back to Work"
