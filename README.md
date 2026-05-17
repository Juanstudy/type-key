# Monkeyterm 🐒⌨️

> Terminal typing test, inspired by [Monkeytype](https://monkeytype.com/).
>
> **Fast. Offline. No tracking. Just you and the terminal.**

Monkeyterm es un test de mecanografía que corre completamente en tu terminal. Inspirado en Monkeytype, pero pensado para desarrolladores que viven en la terminal y no quieren abrir un navegador para practicar.

Construido con **Bun** + **OpenTUI** (core Zig nativo) para máxima velocidad y mínimo overhead.

---

## ✨ Features

| Modo | Descripción |
|------|-------------|
| ⏱️ **Time** | Escribí palabras contra reloj: 15s · 30s · 60s · 120s |
| 📝 **Words** | Completá una cantidad fija de palabras: 10 · 25 · 50 · 100 |
| 📖 **Quotes** | Escribí citas completas de una colección local |

| Funcionalidad | Estado |
|---------------|--------|
| 📊 WPM en tiempo real | ✅ |
| 🎯 Accuracy + errores | ✅ |
| 📈 Historial con gráfica ASCII | ✅ |
| 💾 Resultados persistentes (SQLite) | ✅ |
| ⚙️ Config persistente entre sesiones | ✅ |
| ⌨️ Ctrl+Backspace borra palabra | ✅ |
| 🔄 Tab reinicia, Esc vuelve al menú | ✅ |
| 🌙 Offline, sin cuenta, sin tracking | ✅ |

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

# 2. Instalar dependencias (requiere Zig — ver BUILD.md)
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
                    │  modo:    [tiempo] palabras  citas  │
                    │  tiempo:  15  [30]  60  120         │
                    │                                     │
                    │  idioma:  [english]  spanish        │
                    │                                     │
                    │  [enter] comenzar  [h] historial    │
                    └─────────────────────────────────────┘
```

1. **Menú principal** — navegás con flechas o teclas, elegís modo y config.
2. **Juego** — el timer arranca cuando apretás la primera tecla. WPM en vivo, barra de progreso.
3. **Resultados** — WPM, accuracy, caracteres, errores, comparación vs tu promedio.
4. **Historial** — gráfica de las últimas 20 sesiones, mejor WPM, promedio, total.

### Controles

| Tecla | Acción |
|-------|--------|
| `Backspace` | Borra última letra |
| `Ctrl + Backspace` | Borra última palabra |
| `Tab` | Reinicia el test |
| `Esc` | Vuelve al menú principal |
| `Ctrl + C` | Sale de la app |

---

## 🧱 Stack

| Capa | Tecnología |
|------|-----------|
| **Runtime** | [Bun](https://bun.sh) |
| **UI** | [@opentui/core](https://opentui.com) — core Zig nativo (imperativo, sin React) |
| **Database** | `bun:sqlite` — SQLite embebido nativo |
| **Charts** | [asciichart](https://github.com/kroitor/asciichart) |
| **Language** | TypeScript 6.0.3 (strict mode) |
| **Build** | `bun build --compile` → binario standalone |

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
│   ├── screens/         # Pantallas (menu, game, results, history)
│   ├── engine/          # Lógica central (typing engine, timer, wpm)
│   ├── lib/             # Utilidades (wordlists, quotes, stats, db, config)
│   ├── ui/              # Componentes de UI (word-display, cursor, progress-bar, etc.)
│   ├── data/            # Wordlists y quotes en JSON
│   ├── types.ts         # Tipos compartidos
│   └── index.ts         # Entry point
├── prd.md               # Product Requirements Document
├── BUILD.md             # Instrucciones de build local
├── package.json
└── tsconfig.json
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

Ver [`BUILD.md`](BUILD.md) para instrucciones detalladas de setup.

---

## 🗺️ Roadmap

- [x] PRD + setup del proyecto
- [ ] **Fase 1**: Core del juego (typing engine, timer, modo tiempo funcional)
- [ ] **Fase 2**: Modos palabras, citas, menú, pantalla de resultados
- [ ] **Fase 3**: Persistencia SQLite, historial con gráfica
- [ ] **Fase 4**: CLI flags, distribución npm + binarios
- [ ] *Post-MVP*: Temas (Dracula, Nord, Catppuccin), modo código, wordlists custom

---

## 📄 Licencia

MIT © 2026 [Juanstudy](https://github.com/Juanstudy). Ver [LICENSE](LICENSE).

---

*Hecho con ❤️ y muchas tazas de café. Porque un desarrollador que escribe rápido es un desarrollador feliz.*
