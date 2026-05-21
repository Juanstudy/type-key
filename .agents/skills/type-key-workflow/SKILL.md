---
name: type-key-workflow
description: "Workflow rules for type-key project: git flow, artifacts policy, preferences."
---

## Git Workflow (Opción A)

```text
main (siempre estable)
  ↑ PR o merge
  |
dev (trabajo diario, commits directos)
```

- Trabajar siempre en `dev` — commits directos, sin PR
- `dev` se pushea regularmente a `origin/dev`
- Cambios de `dev` → `main`:
  - Opción 1: `gh pr create --base main` desde `dev` → review → merge
  - Opción 2: `git checkout main && git merge dev && git push origin main`
- Fixes mínimos (<10 líneas): pueden ir directo a `main`
- No hay long-lived branches ni stacked PRs
- Las branches de PR son efímeras: se crean, mergean y borran

## Artifacts Policy (Híbrido)

### OpenSpec (`openspec/changes/`)
Para documentación **permanente y compartible** en el repo:
- SDD proposals, specs, designs, tasks
- Decisiones arquitectónicas consolidadas
- Criterios de aceptación

### Engram (memoria persistente del agente)
Para documentación **del momento y contextual**:
- Descubrimientos técnicos y gotchas
- Decisiones rápidas de sesión
- Resúmenes de sesión
- Preferencias del usuario
- Bugs identificados

### Regla práctica

| Situación | Guardar en |
|-----------|-----------|
| Spec/design aprobado | OpenSpec |
| Tasks para implementar | OpenSpec |
| Bug/descubrimiento | Engram |
| Decisión rápida del usuario | Engram |
| Resumen de sesión | Engram |
| Propuesta de nuevo feature | Ambos |
| Verify report / Judgment Day | Ambos |

## TDD

- Strict TDD: RED → GREEN → REFACTOR
- Test command: `bun run test`
- Typecheck: `bun run typecheck`
- Escribir tests primero antes de implementar

## Preferences Archive

Historial de preferencias del usuario para type-key:

| Fecha | Preferencia | Detalle |
|-------|-----------|---------|
| 2026-05-20 | Idioma | Rioplatense español con voseo para conversación |
| 2026-05-20 | TDD | Strict TDD: RED → GREEN → REFACTOR |
| 2026-05-20 | GGA | Usar `--no-verify` cuando GGA da falsos positivos (test files existentes) |
| 2026-05-20 | Engram | Híbrido: OpenSpec para specs/designs, Engram para sesión y bugs |
| 2026-05-20 | Git flow | Opción A: dev para trabajo, main solo recibe merges |
| 2026-05-20 | Stack | Bun + TypeScript + OpenTUI |
