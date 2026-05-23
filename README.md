# Monkeyterm 🐒⌨️

> Terminal typing test, inspired by [Monkeytype](https://monkeytype.com/).
>
> **Fast. Offline. No tracking. Just you and the terminal.**

Monkeyterm es un test de mecanografía que corre completamente en tu terminal. Inspirado en Monkeytype, pero pensado para desarrolladores que viven en la terminal y no quieren abrir un navegador para practicar.

Construido con **Bun** + **OpenTUI** (core Zig nativo) para máxima velocidad y mínimo overhead.

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
| 🎮 Menú + navegación por flechas            | ✅     |
| 📊 WPM en tiempo real                       | ✅     |
| 📈 Gráfica WPM en resultados                | ✅     |
| 🎯 Accuracy + errores                       | ✅     |
| ⌨️ Backspace borra última letra             | ✅     |
| 🔄 Tab reinicia, Esc vuelve al menú         | ✅     |
| 🗄️ Historial persistente con SQLite        | ✅     |
| 📊 Historial con stats globales + trend     | ✅     |
| 🏷️ Stats separadas por modo (Time / Words)  | ✅     |
| 🌙 Offline, sin cuenta, sin tracking        | ✅     |

---

## 🚀 Quick Start

### Con Bun (recomendado)

```bash
bun install -g monkeyterm
monkeyterm
```

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
│  ← → Mode · ↑↓ Option · Enter      │
│  H History · Ctrl+C Quit            │
└─────────────────────────────────────┘
```

1. **Menú principal** — ← → cambiás entre Time y Words, ↑↓ seleccionás opción, Enter empezás.
2. **Juego** — el timer arranca con la primera tecla. WPM en vivo, letras coloreadas por estado.
3. **Resultados** — WPM, accuracy, caracteres, errores, y **gráfica de WPM durante la sesión**.
4. **Historial** — presioná `H` en el menú para ver stats globales, trend chart y lista de sesiones.

### Controles

| Tecla       | Acción                              |
| ----------- | ----------------------------------- |
| `Backspace` | Borra última letra                  |
| `← →`       | Cambiar modo (Time / Words)         |
| `↑ ↓`       | Navegar opciones / sesiones         |
| `H`         | Abrir historial (desde el menú)     |
| `Enter`     | Empezar test / ver detalle          |
| `Tab`       | Reinicia el test / re-ejecutar      |
| `Esc`       | Vuelve al menú principal / atrás    |
| `Ctrl + C`  | Sale de la app                      |

---

## 🧱 Stack

| Capa         | Tecnología                                                                     |
| ------------ | ------------------------------------------------------------------------------ |
| **Runtime**  | [Bun](https://bun.sh)                                                          |
| **UI**       | [@opentui/core](https://opentui.com) — core Zig nativo (imperativo, sin React) |
| **Database** | `bun:sqlite` — SQLite embebido nativo                                          |
| **Charts**   | [@crafter/charts](https://github.com/crafterjs/charts) — zero-dependency charts for terminal |
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
│   ├── engine/              # Lógica central (typing engine, timer, wpm)
│   │   ├── typing.ts        # Motor de tipeo con estados de letra
│   │   ├── timer.ts         # Timer con callbacks
│   │   ├── wpm.ts           # Cálculo de WPM y accuracy
│   │   └── *.test.ts        # Tests unitarios (strict TDD)
│   ├── lib/
│   │   ├── types.ts         # Tipos compartidos (Letter, StoredSession, etc.)
│   │   ├── db.ts            # Wrapper de bun:sqlite (guardar/leer resultados)
│   │   └── db.test.ts       # Tests de DB
│   ├── data/
│   │   └── wordlists/       # Wordlists en JSON
│   ├── screens.ts           # Todas las screens (menu, game, results, history)
│   ├── screens.test.ts      # Tests de screens
│   └── index.ts             # Entry point + integración
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

# Tests
bun test

# Dev (hot reload with Bun)
bun --watch src/index.ts
```

### Prerrequisitos

- **Bun** >= 1.3
- **Zig** >= 0.14 (para compilar @opentui/core)

Ver [`docs/BUILD.md`](docs/BUILD.md) para instrucciones detalladas de setup.

---

## ✅ Features implementadas

- [x] Modo Time (15s · 30s · 60s · 120s)
- [x] Words Mode (10 · 25 · 50 · 100 palabras)
- [x] WPM en tiempo real + accuracy + errores
- [x] Gráfica WPM-over-time en resultados
- [x] Historial persistente con SQLite
- [x] Stats globales: best/avg por modo, trend chart
- [x] Detalle de sesión con resultados + chart
- [x] Navegación completa: menú, juego, resultados, historial
- [x] 115 tests, typecheck strict

## 🗺️ Próximo

- [ ] Modo citas (colección local)
- [ ] CLI flags (`--time`, `--words`, `--history`)
- [ ] Distribución npm + binarios
- [ ] Temas (Dracula, Nord, Catppuccin)
- [ ] Wordlists custom
- [ ] Modo código (snippets)

---

## 📄 Licencia

MIT © 2026 [Juanstudy](https://github.com/Juanstudy). Ver [LICENSE](LICENSE).

---

_Hecho con ❤️ y muchas tazas de café. Porque un desarrollador que escribe rápido es un desarrollador feliz._
