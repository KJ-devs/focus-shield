# Setup Claude Code

Tu es un orchestrateur de projet. Workflow strict et séquentiel.

Contexte du projet : @project.md

## Règles IMPORTANTES

- **YOU MUST** stabiliser (build + tests + lint) avant de passer à la feature suivante
- **YOU MUST** travailler sur une seule feature à la fois
- **YOU MUST** nettoyer le contexte (`/compact`) entre chaque feature
- **YOU MUST** utiliser l'équipe agentique assignée à chaque US
- **YOU MUST** faire des commits au format `type(scope): description` (ex: `feat(publicapi): add pagination`)
- **YOU MUST** committer et pusher directement sur `main` — pas de branches, pas de PR
- **YOU MUST** lancer `bash scripts/stability-check.sh` AVANT tout push
- **YOU MUST** vérifier l'éligibilité d'une US avant de la démarrer (`bash scripts/check-us-eligibility.sh <numero>`)
- **YOU MUST NOT** démarrer une US dont les dépendances ne sont pas satisfaites
- **YOU MUST NOT** pusher si le stability check échoue

## Gestion du contexte

Quand le contexte approche de sa limite :
1. **YOU MUST** écrire un résumé de l'état courant dans `.claude/context-handoff.md` contenant :
   - La feature en cours et son état d'avancement
   - Les fichiers modifiés et pourquoi
   - Les problèmes rencontrés et décisions prises
   - Les prochaines étapes à faire
   - Le numéro de l'issue GitHub en cours
2. Faire un `/compact` pour nettoyer le contexte
3. Relire `.claude/context-handoff.md` pour reprendre le travail
4. Les issues GitHub servent de source de vérité pour les tasks restantes (`gh issue list`)

## Skills disponibles

### Skills core (toujours présents)

| Skill | Usage |
|-------|-------|
| `/init-project` | **Setup automatique** : analyse le projet, brainstorm les US, génère agents + règles + issues |
| `/forge` | **Team Lead** : décompose une US, délègue aux agents spécialisés, feedback loops, livre stable |
| `/next-feature` | Pipeline linéaire simple (alternative à /forge pour les features simples) |
| `/reviewer` | Revue de code qualité + sécurité |
| `/stabilizer` | Vérifie build + tests + lint + type-check |

### Skills générés par /init-project (spécifiques au projet)

Les agents spécialisés sont **auto-générés** en fonction de la stack et des US.
Exemples : `/frontend-dev`, `/api-dev`, `/db-architect`, `/e2e-tester`...

Après `/init-project`, consulte `.claude/team.md` pour voir les agents disponibles.

### Skills fallback (génériques, utilisés si pas d'agents générés)

| Skill | Usage |
|-------|-------|
| `/architect` | Planifie l'architecture d'une feature |
| `/developer` | Implémente une feature |
| `/tester` | Écrit et lance les tests |

## Commandes

```bash
npm run build                      # Build
npm test                           # Tests
npm run lint                       # Lint
npx tsc --noEmit                   # Type check
bash scripts/stability-check.sh    # Check complet de stabilité
bash scripts/check-us-eligibility.sh --list     # US éligibles (dépendances vérifiées)
bash scripts/check-us-eligibility.sh <numero>   # Vérifier une US spécifique
bash scripts/search-skills.sh --stack           # Chercher des skills communautaires
bash scripts/install-skill.sh <owner/repo>      # Installer un skill depuis GitHub
gh issue list                      # Voir les issues (source de vérité des tasks)
gh issue view <numero>             # Détail d'une issue
gh issue close <numero>            # Fermer une issue terminée
```

## Workflow

1. `/init-project` — Analyse le projet → brainstorm → génère agents + règles → crée les issues
2. `/forge` — Pour chaque US (par priorité) :
   analyse → décompose → délègue aux agents → feedback loops → stabilize → push main → done → clean context
3. Répète 2 jusqu'à ce que toutes les US soient done

> `/next-feature` reste disponible comme alternative linéaire pour les features simples.

## Stratégie Git

```
main ──── commit ──── commit ──── commit ──── ...
```

- **Commit direct sur main** : pas de branches, pas de PR
- **Push** : `git push origin main`
- **Avant push** : toujours lancer le stability check
- **Source de vérité des tasks** : GitHub issues (`gh issue list`)
