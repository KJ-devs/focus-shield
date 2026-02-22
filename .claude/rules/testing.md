# Regles de testing

## Stack de test

- **Unit / Integration** : Vitest
- **E2E** : Playwright
- **Monorepo** : pnpm + Turborepo
- **TypeScript strict** : les tests sont aussi en TypeScript strict, pas de `any`

---

## 1. Structure des fichiers de test

### Packages purs (`packages/*`)

- **YOU MUST** placer les tests dans un dossier `__tests__/` a la racine du package
- **YOU MUST** nommer les fichiers de tests unitaires avec le suffixe `.test.ts`
- **YOU MUST** nommer les fichiers de tests d'integration avec le suffixe `.integration.test.ts`
- **YOU MUST** faire correspondre le nom du fichier de test au fichier source teste

```
packages/session-engine/
  src/
    state-machine.ts
    timer.ts
    presets.ts
  __tests__/
    state-machine.test.ts
    timer.test.ts
    presets.test.ts
    scheduling.integration.test.ts
  vitest.config.ts
  package.json
```

### Apps (`apps/*`)

- **YOU MUST** placer les tests unitaires de composants React dans un dossier `__tests__/` adjacent au composant
- **YOU MUST** nommer les fichiers de tests de composants avec le suffixe `.test.tsx`
- **YOU MUST** placer les tests E2E Playwright dans `apps/desktop/e2e/` ou `apps/browser-extension/e2e/`
- **YOU MUST** nommer les fichiers E2E avec le suffixe `.spec.ts`

```
apps/desktop/
  src/
    components/
      SessionTimer/
        SessionTimer.tsx
        __tests__/
          SessionTimer.test.tsx
  e2e/
    session-flow.spec.ts
    blocking-flow.spec.ts
  vitest.config.ts
  playwright.config.ts
```

### Convention de nommage

| Type de test | Suffixe | Emplacement |
|---|---|---|
| Unit test (TS pur) | `.test.ts` | `packages/<pkg>/__tests__/` |
| Unit test (React) | `.test.tsx` | `apps/<app>/src/**/__tests__/` |
| Integration test | `.integration.test.ts` | `packages/<pkg>/__tests__/` |
| E2E test | `.spec.ts` | `apps/<app>/e2e/` |

- **YOU MUST NOT** melanger les suffixes : `.test.ts` pour Vitest, `.spec.ts` pour Playwright uniquement
- **YOU MUST NOT** placer des tests a la racine du monorepo

---

## 2. Conventions de tests unitaires

### Pattern describe / it

- **YOU MUST** utiliser `describe` pour grouper par fonction/classe/module testee
- **YOU MUST** utiliser `it` (pas `test`) pour chaque cas de test
- **YOU MUST** nommer les `it` comme une phrase qui decrit le comportement attendu, pas l'implementation
- **YOU MUST** imbriquer les `describe` pour les sous-comportements

```typescript
describe('SessionStateMachine', () => {
  describe('start', () => {
    it('should transition from IDLE to STARTING when a valid session config is provided', () => {
      // ...
    });

    it('should throw SessionConfigError when blocks array is empty', () => {
      // ...
    });
  });

  describe('pause', () => {
    it('should transition from FOCUS_ACTIVE to PAUSED when the preset allows pausing', () => {
      // ...
    });

    it('should remain in FOCUS_ACTIVE when the preset forbids pausing', () => {
      // ...
    });
  });
});
```

### Pattern AAA (Arrange-Act-Assert)

- **YOU MUST** structurer chaque test en trois sections clairement separees
- **YOU MUST** ajouter une ligne vide entre Arrange, Act, et Assert
- **YOU MUST NOT** combiner Act et Assert dans une meme expression, sauf pour les assertions de throw

```typescript
it('should calculate focus score based on distraction attempts and duration', () => {
  // Arrange
  const run: SessionRun = createMockSessionRun({
    totalFocusMinutes: 90,
    distractionAttempts: [
      { timestamp: new Date(), type: 'domain', target: 'reddit.com', blocked: true },
    ],
  });

  // Act
  const score = calculateFocusScore(run);

  // Assert
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
  expect(score).toBe(85);
});
```

### Nommage des tests

- **YOU MUST** commencer les noms de `it` par `should` pour decrire le comportement attendu
- **YOU MUST** inclure le contexte conditionnel avec `when` ou `with` dans le `describe` parent ou dans le nom du test
- **YOU MUST NOT** ecrire des noms generiques comme `it('works')` ou `it('test 1')`

Bons exemples :
- `it('should generate a token of 8 alphanumeric characters for lock level 1')`
- `it('should reject the token after 3 failed attempts and enter cooldown')`
- `it('should match wildcard pattern *.reddit.com against sub.reddit.com')`

Mauvais exemples :
- `it('works')`
- `it('token generation')`
- `it('should work correctly')`

---

## 3. Quoi tester par package

### `packages/session-engine`

**Priorite critique** : c'est le coeur de l'application.

- **YOU MUST** tester chaque transition de la state machine individuellement
  - IDLE -> STARTING -> FOCUS_ACTIVE -> BREAK_TRANSITION -> BREAK_ACTIVE -> FOCUS_ACTIVE (cycle)
  - FOCUS_ACTIVE -> UNLOCK_REQUESTED -> COOLDOWN_WAITING -> PASSWORD_ENTRY -> UNLOCKED
  - FOCUS_ACTIVE -> PAUSED -> FOCUS_ACTIVE (si preset l'autorise)
  - Transitions invalides : ex. IDLE -> PAUSED doit throw
- **YOU MUST** tester les presets predefined (Pomodoro Classic, Deep Work, Sprint, Study Session, Flow State, Quick Task, Marathon)
  - Verifier la structure des blocs, les durees, le nombre de cycles
- **YOU MUST** tester la compensation de drift du timer
  - Simuler un timer qui derive de 50ms+ et verifier la correction
  - Tester le timer sur des durees courtes (1s, 5s) avec `vi.useFakeTimers()`
- **YOU MUST** tester l'extension a chaud (prolonger une session en cours)
- **YOU MUST** tester le calcul du focus score
  - Score = 100 pour une session parfaite (aucune distraction, duree complete)
  - Score degrade proportionnellement aux distractions et abandons

```typescript
describe('SessionStateMachine', () => {
  it('should transition IDLE -> STARTING when start() is called with valid config', () => {
    const machine = new SessionStateMachine();

    machine.start(pomodoroPreset);

    expect(machine.state).toBe('STARTING');
  });

  it('should not allow transition from IDLE to PAUSED', () => {
    const machine = new SessionStateMachine();

    expect(() => machine.pause()).toThrow(InvalidTransitionError);
  });
});
```

### `packages/crypto`

**Priorite critique** : la securite du verrouillage depend de ce module.

- **YOU MUST** tester la generation de tokens pour chaque niveau de friction (1 a 5)
  - Niveau 1 : 8 caracteres alphanumeriques
  - Niveau 2 : 16 caracteres mixtes
  - Niveau 3 : 32 caracteres mixtes + symboles
  - Niveau 4 : 48 caracteres
  - Niveau 5 : aucun token (session non interruptible)
- **YOU MUST** tester que les tokens generes respectent les contraintes de charset
- **YOU MUST** tester le hashing Argon2 : hash -> verify cycle
  - Un token correct doit valider
  - Un token incorrect doit echouer
  - Le hash ne doit pas etre reversible (pas de test direct, mais verifier que le hash != token)
- **YOU MUST** tester le rate limiting :
  - 1ere, 2eme, 3eme tentative echouee : autorisees
  - 4eme tentative : bloquee par cooldown de 5 minutes
  - Apres cooldown : nouvelle tentative autorisee
- **YOU MUST** tester le chiffrement AES-256 du master key
  - Encrypt -> decrypt doit retourner le plaintext original
  - Decrypt avec une mauvaise cle doit echouer
- **YOU MUST NOT** tester les algorithmes crypto eux-memes (Argon2, AES) -- ce sont des dependances externes

```typescript
describe('TokenGenerator', () => {
  it('should generate a token of exactly 8 alphanumeric chars for level 1', () => {
    const token = generateToken(1);

    expect(token).toHaveLength(8);
    expect(token).toMatch(/^[a-zA-Z0-9]+$/);
  });
});

describe('RateLimiter', () => {
  it('should block attempts after 3 failures and enforce 5-minute cooldown', () => {
    const limiter = new RateLimiter({ maxAttempts: 3, cooldownMs: 5 * 60 * 1000 });

    limiter.recordFailure();
    limiter.recordFailure();
    limiter.recordFailure();

    expect(limiter.isBlocked()).toBe(true);
    expect(limiter.remainingCooldownMs()).toBeGreaterThan(0);
  });
});
```

### `packages/blocker-core`

**Priorite haute** : le pattern matching doit etre infaillible.

- **YOU MUST** tester le domain matching avec wildcards
  - `*.reddit.com` doit matcher `www.reddit.com`, `old.reddit.com`, `sub.domain.reddit.com`
  - `*.reddit.com` ne doit PAS matcher `reddit.com` (wildcard = au moins un sous-domaine)
  - `reddit.com` doit matcher exactement `reddit.com`
- **YOU MUST** tester le path-based matching
  - `youtube.com/shorts/*` doit matcher `youtube.com/shorts/abc123`
  - `youtube.com/shorts/*` ne doit PAS matcher `youtube.com/watch?v=abc123`
- **YOU MUST** tester l'allowlist qui override la blocklist
  - Si `*.reddit.com` est bloque mais `reddit.com/r/learnprogramming` est en allowlist, ce subreddit doit passer
- **YOU MUST** tester les edge cases :
  - URLs avec ports (`reddit.com:8080`)
  - URLs avec fragments et query params
  - Domaines IDN / punycode
  - Pattern vide ou invalide
  - Doublons dans la blocklist
- **YOU MUST** tester le process matching
  - Match exact : `discord` == `discord`
  - Match aliases : `Discord.exe`, `discord-ptb` doivent tous matcher la regle `discord`
  - Case insensitive sur Windows

```typescript
describe('DomainMatcher', () => {
  it('should match subdomains with wildcard pattern *.reddit.com', () => {
    const matcher = new DomainMatcher(['*.reddit.com']);

    expect(matcher.matches('www.reddit.com')).toBe(true);
    expect(matcher.matches('old.reddit.com')).toBe(true);
    expect(matcher.matches('google.com')).toBe(false);
  });
});
```

### `packages/storage`

**Priorite haute** : la persistance doit etre fiable.

- **YOU MUST** tester toutes les operations CRUD pour chaque entite :
  - Sessions : create, read, update, delete, list
  - SessionRuns : create, read, update (status), list par session
  - Profiles : create, read, update, delete, list
  - Blocklists : create, read, update, delete, list
  - DailyStats : create, read, aggregate par periode
  - Achievements : create, read, update progression
- **YOU MUST** tester les migrations SQLite
  - Appliquer une migration sur une base vide
  - Appliquer une migration incrementale sur un schema existant
  - Verifier que les donnees existantes survivent a la migration
- **YOU MUST** tester les agregations de stats
  - Stats quotidiennes, hebdomadaires, mensuelles
  - Calcul correct des moyennes et totaux
- **YOU MUST** tester l'export CSV/JSON
- **YOU MUST** utiliser une base SQLite in-memory (`:memory:`) pour les tests -- jamais de fichier sur disque
- **YOU MUST NOT** tester SQLite lui-meme -- tester uniquement la couche d'abstraction

```typescript
describe('SessionRepository', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createInMemoryDatabase();
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it('should persist and retrieve a session with all fields intact', async () => {
    const session = buildSession({ name: 'Deep Work', lockLevel: 3 });

    await sessionRepo.create(db, session);
    const retrieved = await sessionRepo.findById(db, session.id);

    expect(retrieved).toEqual(session);
  });
});
```

### `packages/shared-types`

- **YOU MUST NOT** ecrire de tests pour `shared-types` -- ce package ne contient que des types TypeScript et des interfaces. La validation se fait via `tsc --noEmit`.

### `packages/ui-components`

- **YOU MUST** tester les composants React avec `@testing-library/react`
- **YOU MUST** tester les interactions utilisateur (click, input, keyboard)
- **YOU MUST** tester le composant `PasswordInput` anti-triche specifiquement :
  - Paste desactive (onPaste bloque)
  - Masquage toggle show/hide
  - Rate limiting UI (desactivation du bouton apres X tentatives)

---

## 4. Regles de mocking

### Quand mocker

- **YOU MUST** mocker les timers avec `vi.useFakeTimers()` dans session-engine et crypto (cooldowns)
- **YOU MUST** mocker SQLite dans les tests unitaires de storage (utiliser `:memory:` pour l'integration)
- **YOU MUST** mocker les appels Tauri IPC (`@tauri-apps/api`) dans les tests de composants React
- **YOU MUST** mocker le filesystem pour les tests de hosts manager (pas de modification du vrai `/etc/hosts`)
- **YOU MUST** mocker `crypto.getRandomValues` ou equivalent uniquement pour les tests deterministes de generation de tokens
- **YOU MUST** mocker les APIs navigateur (`chrome.declarativeNetRequest`, `chrome.runtime`) dans les tests de l'extension

### Quand NE PAS mocker

- **YOU MUST NOT** mocker la state machine de session-engine -- tester la vraie implementation
- **YOU MUST NOT** mocker le pattern matching de blocker-core -- c'est de la logique pure, tester le vrai code
- **YOU MUST NOT** mocker les fonctions de hashing/chiffrement dans les tests d'integration de crypto -- utiliser les vraies fonctions
- **YOU MUST NOT** mocker Zustand dans les tests de composants -- tester avec le vrai store (utiliser un store isole par test)
- **YOU MUST NOT** mocker les types de `shared-types` -- ils n'ont pas d'implementation

### Utilitaires de test

- **YOU MUST** creer des factories de test dans `__tests__/helpers/` pour chaque package
  - `buildSession(overrides?)` -- cree une Session valide avec des valeurs par defaut
  - `buildSessionRun(overrides?)` -- cree un SessionRun valide
  - `createMockSessionRun(overrides?)` -- alias pour les noms historiques
  - `buildProfile(overrides?)` -- cree un Profile valide
  - `buildBlocklist(overrides?)` -- cree un BlocklistPreset valide
- **YOU MUST** utiliser ces factories au lieu de creer des objets inline dans chaque test
- **YOU MUST NOT** partager d'etat mutable entre les tests -- chaque `it` doit etre independant

```typescript
// packages/session-engine/__tests__/helpers/factories.ts
export function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    name: 'Test Session',
    blocks: [{ type: 'focus', duration: 25, blockingEnabled: true }],
    lockLevel: 1,
    blocklist: 'social-media',
    autoStart: false,
    profileId: 'default',
    notifications: {
      onBlockStart: true,
      onBlockEnd: true,
      halfwayReminder: false,
      onAttemptedDistraction: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## 5. Couverture de code

### Seuils obligatoires

| Cible | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `packages/session-engine` | > 90% | > 85% | > 90% | > 90% |
| `packages/crypto` | > 90% | > 85% | > 90% | > 90% |
| `packages/blocker-core` | > 90% | > 85% | > 90% | > 90% |
| `packages/storage` | > 85% | > 80% | > 85% | > 85% |
| `packages/ui-components` | > 80% | > 75% | > 80% | > 80% |
| `apps/desktop` | > 70% | > 65% | > 70% | > 70% |
| `apps/browser-extension` | > 70% | > 65% | > 70% | > 70% |

- **YOU MUST** configurer les seuils de couverture dans `vitest.config.ts` de chaque package
- **YOU MUST NOT** baisser un seuil de couverture pour faire passer la CI -- corriger le code ou ajouter des tests
- **YOU MUST NOT** ecrire des tests vides ou triviaux (`expect(true).toBe(true)`) pour gonfler la couverture

### Configuration vitest pour la couverture

```typescript
// vitest.config.ts (exemple pour session-engine)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
```

---

## 6. Commandes

### Lancer les tests

```bash
# Tous les tests du monorepo (via Turborepo)
pnpm test

# Tests d'un package specifique
pnpm --filter @focus-shield/session-engine test
pnpm --filter @focus-shield/crypto test
pnpm --filter @focus-shield/blocker-core test
pnpm --filter @focus-shield/storage test

# Tests avec couverture
pnpm --filter @focus-shield/session-engine test -- --coverage

# Tests en mode watch (pendant le developpement)
pnpm --filter @focus-shield/session-engine test -- --watch

# Lancer un seul fichier de test
pnpm --filter @focus-shield/session-engine test -- __tests__/state-machine.test.ts

# Tests E2E (Playwright)
pnpm --filter @focus-shield/desktop e2e
pnpm --filter @focus-shield/browser-extension e2e

# Type-check (valide aussi shared-types)
npx tsc --noEmit

# Stability check complet (build + tests + lint + type-check)
bash scripts/stability-check.sh
```

### Scripts package.json attendus

Chaque package et app doit definir ces scripts dans son `package.json` :

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Pour les apps avec E2E :

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test",
    "e2e:headed": "playwright test --headed"
  }
}
```

---

## 7. Regles supplementaires

### Tests et CI

- **YOU MUST** faire passer tous les tests avant de push (`bash scripts/stability-check.sh`)
- **YOU MUST** ecrire les tests AVANT ou EN MEME TEMPS que le code de production -- pas apres coup
- **YOU MUST** ajouter des tests pour chaque bug fix (test de regression qui echoue sans le fix)
- **YOU MUST NOT** desactiver un test existant avec `.skip` ou `.todo` pour faire passer la CI
- **YOU MUST NOT** committer des `it.only` ou `describe.only` -- la CI doit tout executer

### Tests React (desktop app + ui-components)

- **YOU MUST** utiliser `@testing-library/react` et non `enzyme` ou `react-test-renderer`
- **YOU MUST** tester le comportement utilisateur, pas les details d'implementation
  - Bon : `expect(screen.getByText('Session active')).toBeInTheDocument()`
  - Mauvais : `expect(component.state.isActive).toBe(true)`
- **YOU MUST** utiliser `userEvent` de `@testing-library/user-event` pour simuler les interactions
- **YOU MUST** configurer `environment: 'jsdom'` dans le vitest.config.ts des apps React

### Tests E2E (Playwright)

- **YOU MUST** tester les flows critiques : lancement de session, blocage, unlock, review post-session
- **YOU MUST** utiliser des `data-testid` pour les selecteurs Playwright -- pas de selecteurs CSS fragiles
- **YOU MUST NOT** tester la logique metier en E2E -- c'est le role des tests unitaires
- **YOU MUST** garder les tests E2E courts et independants (pas de dependance d'ordre entre les tests)

### Tests de l'extension navigateur

- **YOU MUST** tester le service worker (background script) en isolation avec des mocks de `chrome.*` APIs
- **YOU MUST** tester le pattern matching `declarativeNetRequest` avec des cas reels de domaines
- **YOU MUST** tester la page de blocage (rendu correct du message, timer, compteur)
