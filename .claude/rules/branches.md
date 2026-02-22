# Stratégie Git : Commit direct sur main

- **YOU MUST** committer et pusher directement sur `main`
- **YOU MUST NOT** créer de branches feature
- **YOU MUST NOT** créer de Pull Requests
- **YOU MUST** lancer `bash scripts/stability-check.sh` AVANT tout push

## Workflow

```bash
# 1. Développer sur main
git add <fichiers>
git commit -m "type(scope): description"

# 2. Avant de push — toujours vérifier la stabilité
bash scripts/stability-check.sh

# 3. Push direct sur main
git push origin main
```

## Règles strictes

- **JAMAIS** de branches feature — tout va direct sur `main`
- **JAMAIS** de PR — on push direct
- **JAMAIS** de push si le stability check échoue
- Commits atomiques : un commit = un changement logique
- Fermer l'issue GitHub correspondante après push (`gh issue close <numero>`)

## Tracking des tasks

- Les **GitHub issues** sont la source de vérité pour les tasks
- Consulter les issues : `gh issue list`
- Fermer après livraison : `gh issue close <numero>`
