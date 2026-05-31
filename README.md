# Monkeyterm 🐒⌨️

> Terminal typing test, inspired by [Monkeytype](https://monkeytype.com/).
>
> **Fast. Offline. No tracking. Just you and the terminal.**

**v1.1.0** — Built with Bun + OpenTUI + SQLite.

Monkeyterm es un test de mecanografía que corre completamente en tu terminal. Inspirado en Monkeytype, pero pensado para desarrolladores que viven en la terminal y no quieren abrir un navegador para practicar.

Los resultados de cada sesión se guardan automáticamente en **SQLite** (`~/.local/share/type-key/type-key.db`) y podés verlos en el historial con stats globales, desglose por modo y gráfica de tendencia.

---

## ✨ Features

| Modo          | Descripción                                                | Estado |
| ------------- | ---------------------------------------------------------- | ------ |
| ⏱️ **Time**   | Escribí palabras contra reloj: 15s · 30s · 60s · 120s      | ✅     |
| 📝 **Words**  | Completá una cantidad fija de palabras: 10 · 25 · 50 · 100 | ✅     |
| 📖 **Quotes** | Escribí citas completas de una colección local             | 🔜     |

| Funcionalidad                               | Estado |
| ------------------------------------------- | ------ |
| 🎮 Menú + navegación por flechas + Vim keys | ✅     |
| 📊 WPM en tiempo real                       | ✅     |
| 📈 Gráfica WPM con chart() + sparkArea      | ✅     |
| 🎯 Accuracy + errores                       | ✅     |
| ⌨️ Backspace borra última letra             | ✅     |
| 🔄 Tab reinicia, Esc vuelve al menú         | ✅     |
| 🗄️ Historial persistente con SQLite        | ✅     |
| 📊 Stats globales por modo + trend chart    | ✅     |
| 📋 Detalle de sesión con gráfica            | ✅     |
| 🔍 Navegación por páginas en historial      | ✅     |
| 🌙 Offline, sin cuenta, sin tracking        | ✅     |
| 🏗️ Arquitectura modular (screens/, ui/, lib/) | ✅   |

---

## 🚀 Quick Start

### Desde source

```bash
# 1. Clonar
git clone https://github.com/Juanstudy/type-key
cd type-key

# 2. Instalar dependencias (requiere Zig — ver docs/BUILD.md)
bun install

# 3. Correr en desarrollo
bun dev

# 4. O compilar a binario standalone
bun build ./src/index.ts --compile --outfile monkeyterm
./monkeyterm
```

---

## 🎮 Cómo se usa

```
┌─────────────────────────────────────┐
│           monkeyterm                │
│                                     │
│  Time            ·  Words           │
│                                     │
│  ▸ 30s                              │
│    60s                              │
│    120s                             │
│                                     │
│  ← →/hl Mode · ↑↓/jk Option · Enter│
│  h History · Ctrl+C Quit            │
└─────────────────────────────────────┘
```

1. **Menú principal** — ← → o `h`/`l` cambiás entre Time y Words, ↑↓ o `j`/`k` seleccionás opción, Enter empezás.
2. **Juego** — el timer arranca con la primera tecla. WPM en vivo, letras coloreadas por estado.
3. **Resultados** — WPM, accuracy, caracteres, errores, y **gráfica WPM con barras █ + eje Y**.
4. **Historial** — presioná `h` en el menú para ver stats globales, trend chart y lista paginada. ← → o `h`/`l` para cambiar página.

### Controles

| Tecla               | Acción                              |
| ------------------- | ----------------------------------- |
| `Backspace`         | Borra última letra                  |
| `← →` / `h` `l`    | Cambiar modo / página historial     |
| `↑ ↓` / `j` `k`    | Navegar opciones / sesiones         |
| `h`                 | Abrir historial (desde el menú)     |
| `Enter`             | Empezar test / ver detalle          |
| `Tab`               | Reinicia el test / re-ejecutar      |
| `Esc`               | Vuelve al menú principal / atrás    |
| `Ctrl + C`          | Sale de la app                      |

---

## 🧱 Stack

| Capa         | Tecnología                                                                     |
| ------------ | ------------------------------------------------------------------------------ |
| **Runtime**  | [Bun](https://bun.sh)                                                          |
| **UI**       | [@opentui/core](https://opentui.com) — core Zig nativo (imperativo, sin React) |
| **Database** | `bun:sqlite` — SQLite embebido nativo                                          |
| **Charts**   | [@crafter/charts](https://github.com/crafterjs/charts) — chart() + sparkArea   |
| **Language** | TypeScript 6.0.3 (strict mode)                                                 |
| **Build**    | `bun build --compile` → binario standalone                                     |

### ¿Por qué OpenTUI Core imperativo y no React?

OpenTUI ofrece dos caminos: el Core imperativo (`@opentui/core`) y el reconciler de React (`@opentui/react`). Elegimos el imperativo porque:

- **10-50x más rápido** en benchmarks de construcción de árbol y actualización de contenido.
- **Modelo mental más directo** para un typing test: mutación directa de objetos, sin Virtual DOM.
- **Control total** sobre el ciclo de render, crítico para animaciones de cursor y actualizaciones en cada keystroke.

---

## 📁 Estructura del proyecto

```
monkeyterm/
├── src/
│   ├── screens/             # Una screen por archivo
│   │   ├── menu.ts          # buildMenu()
│   │   ├── game.ts          # buildGame()
│   │   ├── results.ts       # buildResults()
│   │   └── history.ts       # buildHistory(), buildEmptyHistory(), buildHistoryDetail()
│   ├── engine/              # Lógica central (intacta)
│   │   ├── typing.ts        # Motor de tipeo con estados de letra
│   │   ├── timer.ts         # Timer con callbacks
│   │   ├── wpm.ts           # Cálculo de WPM y accuracy
│   │   └── *.test.ts        # Tests unitarios (strict TDD)
│   ├── ui/                  # Primitivas de UI
│   │   ├── theme.ts         # Paleta de colores
│   │   ├── chart.ts         # buildWpmChart(), sparkArea, helpers
│   │   └── word-display.ts  # wordText(), colored()
│   ├── lib/
│   │   ├── types.ts         # Tipos compartidos (+SessionResult)
│   │   ├── db.ts            # Wrapper bun:sqlite (guardar/leer)
│   │   ├── db.test.ts       # Tests de DB
│   │   ├── wordlists.ts     # shuffleWords()
│   │   ├── state.ts         # Estado global + transiciones + keyboard
│   │   └── config.ts        # Placeholder para config persistente
│   ├── data/
│   │   └── wordlists/       # Wordlists en JSON
│   ├── screens.ts           # Barrel file (re-exports públicos)
│   ├── screens.test.ts      # Tests de screens
│   └── index.ts             # Entry point (~35 líneas)
├── docs/
│   ├── PRD.md               # Product Requirements Document
│   ├── BUILD.md             # Instrucciones de build local
│   └── AGENTS.md            # Reglas de code review (GGA)
├── openspec/                # Artefactos SDD
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Desarrollo

```bash
# Type checking
bun run typecheck

# Tests (115 tests)
bun test

# Dev (hot reload)
bun --watch src/index.ts
```

### Prerrequisitos

- **Bun** >= 1.3
- **Zig** >= 0.14 (para compilar @opentui/core con el binario standalone)

Ver [`docs/BUILD.md`](docs/BUILD.md) para instrucciones detalladas de setup.

---

## ✅ Features implementadas

- [x] Modo Time (15s · 30s · 60s · 120s)
- [x] Words Mode (10 · 25 · 50 · 100 palabras)
- [x] WPM en tiempo real + accuracy + errores
- [x] Gráfica WPM con chart() (barras █, eje Y, 6 líneas)
- [x] Trend chart compacto con sparkArea() (3 líneas)
- [x] Historial persistente con SQLite
- [x] Stats globales: best/avg por modo
- [x] Detalle de sesión con resultados + chart
- [x] Navegación completa: menú, juego, resultados, historial
- [x] Vim-style key bindings (h/l/j/k)
- [x] Paginación en historial (← → / h l)
- [x] Arquitectura modular: screens/, ui/, lib/
- [x] State management extraído a lib/state.ts
- [x] 115 tests, typecheck strict

## 🗺️ Próximo

- [ ] Modo citas (colección local)
- [ ] CLI flags (`--time`, `--words`, `--history`)
- [ ] Config persistente (`lib/config.ts` — shell listo)
- [ ] Distribución npm + binarios
- [ ] Temas (Dracula, Nord, Catppuccin)
- [ ] Wordlists custom
- [ ] Modo código (snippets)

---

## 📋 Changelog

### v1.1.0 (2026-05-29)

- **Refactor estructural completo**: arquitectura modular con `screens/`, `ui/`, `lib/` — 6 chained PRs
- **State extraction**: estado global y transiciones extraídos de `index.ts` a `lib/state.ts`
- **Barrel file**: `screens.ts` ahora es barrel puro (7 re-exports)
- **Vim-style key bindings**: `h`/`l` para ← →, `j`/`k` para ↑↓
- **Paginación**: navegación por páginas en historial
- **Gráficas mejoradas**: `chart()` builder con barras █, eje Y y colores; `sparkArea()` para trend
- **SDD completo**: proposal, spec, design, tasks — artifacts en `openspec/changes/`
- **Judgment Day**: dual review con fixes aplicados

### v1.0.0

- MVP inicial: Modo Time + Words, WPM en vivo, SQLite, historial, 115 tests

---

## 📄 Licencia

MIT © 2026 [Juanstudy](https://github.com/Juanstudy). Ver [LICENSE](LICENSE).

---

_Hecho con ❤️ y muchas tazas de café. Porque un desarrollador que escribe rápido es un desarrollador feliz._
