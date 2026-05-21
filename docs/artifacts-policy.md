# Artifacts Policy — type-key

Este proyecto usa un enfoque **híbrido** para documentación de desarrollo:

## OpenSpec (`openspec/changes/`)
Archivos committed al repo. Contienen documentación **permanente y compartible**:
- SDD proposals, specs, designs, tasks
- Decisiones arquitectónicas consolidadas
- Criterios de aceptación y casos de prueba

Cualquier developer que clone el repo los ve sin depender del agente.

## Engram (memoria persistente)
No va al repo. Contiene documentación **del momento y contextual**:
- Descubrimientos técnicos y gotchas
- Decisiones rápidas durante la sesión
- Resúmenes de sesión para retomar después
- Preferencias del usuario
- Bugs identificados y fixes aplicados

El agente guarda en Engram automáticamente; no hay que acordarse.

## Regla práctica

| Situación | Guardar en |
|-----------|-----------|
| Spec/design aprobado | OpenSpec |
| Tasks para implementar | OpenSpec |
| Bug descubierto durante revisión | Engram |
| Decisión rápida del usuario | Engram |
| Resumen de sesión | Engram |
| Propuesta de nuevo feature | Ambos |
| Verify report / Judgment Day | Ambos |
