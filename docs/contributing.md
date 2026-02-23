# Contributing to Focus Shield

Thank you for your interest in contributing to Focus Shield! This document explains how to set up your development environment, understand the project structure, run tests, and submit changes.

---

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 10 or later (`npm install -g pnpm`)
- **Rust** stable toolchain (only required for building the Tauri desktop app)
- **Git**

---

## Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/KJ-devs/focus-shield.git
cd focus-shield

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run tests
pnpm test

# 5. Run linting
pnpm lint

# 6. Run type checking
pnpm type-check
```

### Running a specific package

```bash
# Build a single package
pnpm --filter @focus-shield/session-engine build

# Test a single package
pnpm --filter @focus-shield/crypto test

# Watch mode for development
pnpm --filter @focus-shield/blocker-core test:watch
```

### Running the desktop app (requires Rust)

```bash
cd apps/desktop
pnpm tauri dev
```

### Running the sync server

```bash
cd apps/sync-server
docker compose up -d
```

---

## Project Structure

```
focus-shield/
  apps/
    desktop/               Tauri 2.0 app (React + Rust)
    browser-extension/     Chrome/Firefox Manifest V3 extension
    web/                   Landing page (static HTML)
    sync-server/           NestJS sync server
  packages/
    shared-types/          TypeScript types (no runtime code)
    session-engine/        Session state machine and timers
    crypto/                Token generation, hashing, encryption
    blocker-core/          Domain and process matching logic
    storage/               SQLite abstraction and migrations
    ui-components/         Reusable React components
  docs/                    Documentation
  scripts/                 Build and CI scripts
```

### Dependency Rules

- `apps/` can import from `packages/`. Never the reverse.
- Apps must not import from each other.
- `session-engine`, `crypto`, `blocker-core`, and `storage` are pure TypeScript -- no React.
- All shared types go in `@focus-shield/shared-types`.
- No circular dependencies between packages.

---

## Running Tests

### Unit Tests (Vitest)

```bash
# All tests
pnpm test

# Single package
pnpm --filter @focus-shield/session-engine test

# With coverage
pnpm --filter @focus-shield/session-engine test -- --coverage

# Watch mode
pnpm --filter @focus-shield/session-engine test -- --watch
```

### E2E Tests (Playwright)

```bash
# Desktop E2E
pnpm --filter @focus-shield/desktop e2e

# Browser extension E2E
pnpm --filter @focus-shield/browser-extension e2e
```

### Full Stability Check

```bash
bash scripts/stability-check.sh
```

This runs build, tests, linting, and type checking for the entire monorepo.

---

## Code Style and Conventions

### TypeScript

- Strict mode everywhere -- no `any`.
- `camelCase` for variables and functions, `PascalCase` for types and components.
- Keep functions short and focused (under 50 lines).
- No `console.log` in production code.
- No commented-out code.

### Imports

- External dependencies first, then internal imports.
- Use the `@focus-shield/` scope for internal packages.
- Never use deep imports into package internals.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

feat(session-engine): add pomodoro preset support
fix(crypto): correct rate limiter cooldown calculation
test(blocker-core): add wildcard pattern edge cases
refactor(storage): extract migration runner
docs(readme): update installation instructions
chore(ci): add type-check step to CI pipeline
```

### Tests

- Use `describe` / `it` (not `test`).
- Follow the AAA pattern: Arrange, Act, Assert.
- Name tests with `should ...` describing expected behavior.
- Place test files in `__tests__/` directories with `.test.ts` suffix.
- Use test factories instead of inline object construction.

---

## How to Submit Changes

Focus Shield uses a direct-to-main workflow:

1. Fork the repository on GitHub.
2. Clone your fork and create a feature branch locally.
3. Make your changes and ensure all checks pass (`bash scripts/stability-check.sh`).
4. Push to your fork and open a Pull Request against `main`.
5. Describe your changes clearly in the PR description.

### PR Checklist

- [ ] All existing tests pass.
- [ ] New code has tests.
- [ ] No TypeScript errors (`pnpm type-check`).
- [ ] No linting errors (`pnpm lint`).
- [ ] Commit messages follow Conventional Commits.
- [ ] Documentation updated if applicable.
