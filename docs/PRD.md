# PRD — Monkeyterm

**Product Requirements Document v1.1**
_Última actualización: Mayo 2026_

---

## 1. Visión general

Monkeyterm es un test de escritura para terminal, inspirado en Monkeytype, desarrollado en TypeScript con **Bun** y **OpenTUI**. Corre completamente offline, no requiere cuenta ni conexión a internet, y se distribuye como paquete npm global o como binario standalone.

El cambio a Bun + OpenTUI (desde el stack original Node + Ink 5) responde a tres objetivos:

- **Rendimiento nativo**: OpenTUI corre sobre un core Zig nativo, con renderizado mucho más rápido que ANSI puro.
- **Startup instantáneo**: Bun arranca al instante, crítico para una herramienta de typing test.
- **Cero fricción**: TypeScript nativo, test runner incluido, SQLite embebido sin dependencias externas.

---

## 2. Objetivos del producto

- Proveer una experiencia de typing test fluida y responsiva en la terminal.
- Soportar múltiples modos de juego desde el MVP.
- Persistir resultados localmente y visualizar el progreso del usuario a lo largo del tiempo.
- Ser instalable con un solo comando (`bun install -g monkeyterm` o binary release).
- Sentar una base de código limpia que permita añadir temas y funcionalidades futuras sin refactors mayores.

### Fuera de alcance (por ahora)

- Autenticación y cuentas de usuario.
- Sincronización multidispositivo.
- Modo multijugador.

---

## 3. Usuarios objetivo

Desarrolladores y profesionales técnicos que:

- Viven en la terminal y prefieren no salir de ella.
- Quieren practicar mecanografía sin abrir un navegador.
- Valoran herramientas minimalistas, rápidas y sin fricción.

---

## 4. Modos de juego

### 4.1 Modo Tiempo

El usuario escribe palabras aleatorias durante un tiempo fijo. Al acabar el tiempo, se muestra la pantalla de resultados.

**Duraciones disponibles:** 15s · 30s · 60s · 120s

### 4.2 Modo Palabras

El usuario escribe un número fijo de palabras. El test termina cuando completa la última.

**Cantidades disponibles:** 10 · 25 · 50 · 100 palabras

### 4.3 Modo Citas

El usuario escribe una cita completa extraída de una colección local. El test termina al completar la cita. Las citas tienen longitudes variadas (cortas, medianas, largas) y se indica la fuente al terminar.

---

## 5. Mecánicas de juego

### 5.1 Flujo de una sesión

```
Pantalla de inicio
  → Usuario selecciona modo y configuración
    → Pantalla de juego (empieza al primer keypress)
      → Pantalla de resultados
        → [Tab] para reiniciar · [Esc] para volver al menú
```

### 5.2 Comportamiento del input

- El test **no empieza hasta el primer keypress**. El timer arranca en ese momento.
- **Backspace** borra la última letra escrita.
- **Ctrl + Backspace** borra la última palabra completa.
- **Tab** en cualquier momento reinicia el test con la misma configuración.
- **Esc** en cualquier momento vuelve al menú principal.
- No se puede avanzar a la siguiente palabra si la actual tiene errores (comportamiento igual a Monkeytype con `strictSpace: true`).

### 5.3 Estados de una letra

```
untyped    → gris (aún no escrita)
correct    → blanco/verde (según tema)
incorrect  → rojo (error)
extra      → rojo oscuro (letras de más escritas)
```

### 5.4 Cálculo de estadísticas

```
Gross WPM  = (total de caracteres correctos / 5) / minutos transcurridos
Errores    = pulsaciones incorrectas / minutos transcurridos
Net WPM    = Gross WPM - Errores
Accuracy   = (caracteres correctos / total pulsaciones) * 100
```

---

## 6. Pantallas y componentes UI

### 6.1 Menú principal

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

Navegación con flechas o teclas de letra. La configuración seleccionada persiste entre sesiones.

### 6.2 Pantalla de juego

```
┌─────────────────────────────────────┐
│  30s                        45 wpm  │
│                                     │
│  the quick brown fox jumps over the │
│  lazy dog and then some more words  │
│                                     │
│  ████████████░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────┘
```

- Timer en la esquina superior izquierda (cuenta regresiva en modo tiempo, progreso en modo palabras).
- WPM en tiempo real en la esquina superior derecha (aparece tras las primeras 3 palabras).
- Palabras en el centro: máximo 3 líneas visibles, scroll automático.
- Cursor blinking en la posición actual.
- Barra de progreso inferior.

### 6.3 Pantalla de resultados

```
┌─────────────────────────────────────┐
│            resultados               │
│                                     │
│   wpm          accuracy             │
│   87            96%                 │
│                                     │
│   caracteres   errores   tiempo     │
│   312           13        30s       │
│                                     │
│   ▲ +5 wpm vs tu promedio           │
│                                     │
│   [tab] reiniciar  [h] historial    │
│   [esc] menú                        │
└─────────────────────────────────────┘
```

### 6.4 Pantalla de historial

```
┌─────────────────────────────────────┐
│            historial                │
│                                     │
│   100 ┤                        ╭─   │
│    80 ┤              ╭──╮   ╭──╯    │
│    60 ┤    ╭──╮  ╭──╯  ╚───╯       │
│    40 ┤────╯  ╚──╯                  │
│       └──────────────────────────   │
│       últimas 20 sesiones           │
│                                     │
│   mejor:    102 wpm                 │
│   promedio: 78 wpm  (últimas 10)   │
│   sesiones: 47                      │
│                                     │
│   [↑↓] ver detalles  [esc] volver   │
└─────────────────────────────────────┘
```

---

## 7. Persistencia local

### 7.1 Configuración

Archivo: `~/.config/monkeyterm/config.json`

```json
{
  "mode": "time",
  "time": 30,
  "wordCount": 50,
  "language": "english"
}
```

Implementación: **Bun.file** + JSON.parse/stringify. Las rutas XDG se resuelven con `process.env` + `os.homedir()`.

### 7.2 Historial de resultados

Archivo: `~/.local/share/monkeyterm/results.db` (SQLite)

```sql
CREATE TABLE results (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  wpm        REAL NOT NULL,
  accuracy   REAL NOT NULL,
  mode       TEXT NOT NULL,     -- 'time' | 'words' | 'quote'
  duration   INTEGER,           -- segundos (modo tiempo)
  word_count INTEGER,           -- (modo palabras)
  language   TEXT NOT NULL,
  raw_wpm    REAL NOT NULL,
  chars      INTEGER NOT NULL,
  errors     INTEGER NOT NULL
);
```

Implementación: **bun:sqlite** (SQLite nativo, sincrónico, cero configuración, sin dependencias externas).

### 7.3 Wordlists y citas

Empaquetadas dentro del binario como JSON:

```
src/data/
  wordlists/
    english.json     (~1000 palabras más comunes)
    spanish.json     (~1000 palabras más comunes)
  quotes/
    english.json
    spanish.json
```

Las listas de palabras base se pueden tomar del repositorio público de Monkeytype.

---

## 8. CLI y configuración por flags

```bash
# Uso básico (abre el menú)
monkeyterm

# Directo a un modo
monkeyterm --time 60
monkeyterm --words 50
monkeyterm --quotes

# Opciones adicionales
monkeyterm --lang spanish
monkeyterm --history          # abre directo al historial

# Info
monkeyterm --version
monkeyterm --help
```

Parseo con **Bun.argv** directamente (MVP) o **cac** si se necesita más sofisticación.

---

## 9. Stack tecnológico

| Capa           | Tecnología                               | Razón                                                                                       |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Runtime        | **Bun**                                  | TypeScript nativo, startup instantáneo, bundler + test runner + package manager todo en uno |
| UI en terminal | **@opentui/core** (imperativo)           | Core Zig nativo, flexbox layout, componentes built-in, renderizado de alto rendimiento      |
| Input handling | **@opentui/core** (focus + keyboard API) | Manejo de teclado integrado, raw mode abstraction                                           |
| SQLite         | **bun:sqlite**                           | SQLite embebido, nativo de Bun, cero dependencias externas                                  |
| Config         | **Bun.file + JSON**                      | Sin librerías externas, XDG paths resueltos manualmente                                     |
| Gráficas       | **asciichart**                           | ASCII charts para el historial, funciona en Bun sin cambios                                 |
| CLI flags      | **Bun.argv** / **cac**                   | Mínimo necesario, escalable si se requiere                                                  |
| Build          | **Bun build**                            | `bun build --compile` produce binarios standalone sin Node                                  |
| Distribución   | **npm (global) + GitHub Releases**       | `bun install -g monkeyterm` o descargar binary                                              |
| Tests          | **bun test**                             | Test runner nativo, zero config                                                             |

### Por qué OpenTUI Core imperativo (no React)

OpenTUI ofrece dos caminos: el **Core imperativo** (`@opentui/core`) y el **reconciler de React** (`@opentui/react`). Elegimos el Core imperativo porque:

- **10-50x más rápido** en construcción de árbol y actualización de contenido (según benchmarks del propio proyecto).
- **Modelo mental más directo** para un typing test: mutación directa de objetos, sin Virtual DOM.
- **Menos overhead de memoria**: el driver React puede superar los 10GB RSS en escenarios complejos; el Core se mantiene bajo 280MB.
- **Control total** sobre el ciclo de render, crítico para animaciones de cursor y actualizaciones en cada keystroke.

---

## 10. Arquitectura del proyecto

```
monkeyterm/
├── src/
│   ├── screens/
│   │   ├── menu.ts            # Pantalla de inicio y selección de modo
│   │   ├── game.ts            # Orquestador de la pantalla de juego
│   │   ├── results.ts         # Pantalla de resultados
│   │   └── history.ts         # Pantalla de historial + gráfica
│   ├── engine/
│   │   ├── typing.ts          # Lógica central: estados de letras, detección de errores, navegación
│   │   ├── timer.ts           # Timer con callbacks de inicio/fin
│   │   └── wpm.ts             # Cálculo de WPM en tiempo real
│   ├── lib/
│   │   ├── wordlists.ts       # Carga y shuffle de listas de palabras
│   │   ├── quotes.ts          # Carga aleatoria de citas
│   │   ├── stats.ts           # Fórmulas de WPM, accuracy, etc.
│   │   ├── db.ts              # Wrapper de bun:sqlite (guardar/leer resultados)
│   │   └── config.ts          # Read/write de config con Bun.file
│   ├── ui/
│   │   ├── word-display.ts    # Render de palabras con estados de letra (construye Boxes/Texts)
│   │   ├── cursor.ts          # Manejo de cursor blinking
│   │   ├── timer-display.ts   # Render del timer/progreso
│   │   ├── live-stats.ts      # WPM en tiempo real
│   │   ├── progress-bar.ts    # Barra de progreso inferior
│   │   └── theme.ts           # Paleta de colores (prepara para sistema de temas futuro)
│   ├── data/
│   │   ├── wordlists/
│   │   │   ├── english.json
│   │   │   └── spanish.json
│   │   └── quotes/
│   │       ├── english.json
│   │       └── spanish.json
│   ├── types.ts               # Tipos compartidos (LetterState, WordState, Result, Config...)
│   └── index.ts               # Entry point: init renderer, screen router, event loop
├── package.json
├── tsconfig.json
├── README.md
└── BUILD.md                   # Instrucciones de build local (Zig + Bun)
```

### Flujo de ejecución

```
index.ts
  ├── initRenderer()          → createCliRenderer ({exitOnCtrlC: true})
  ├── showScreen('menu')      → renderer.root.add(menuScreen)
  ├── event loop              → escucha teclas, delega a screen activa
  │   ├── MenuScreen          → flechas/letras navegan opciones, Enter arranca juego
  │   ├── GameScreen          → typing engine activo, timer corriendo, actualiza render
  │   ├── ResultsScreen       → stats, [Tab] reinicia, [Esc] menú
  │   └── HistoryScreen       → asciichart + stats agregadas
  └── cleanup                 → renderer.destroy()
```

### Principio de screen management

Cada screen es una función que recibe el `renderer` y el estado global, construye componentes OpenTUI y los monta en `renderer.root`. La screen activa se reemplaza limpiando `renderer.root.removeChildren()` y agregando la nueva.

---

## 11. Tipos centrales

```typescript
type LetterState = "untyped" | "correct" | "incorrect" | "extra";

type Letter = {
  char: string;
  state: LetterState;
};

type Word = {
  letters: Letter[];
  hasError: boolean;
  isCompleted: boolean;
};

type GameMode = "time" | "words" | "quote";

type GameConfig = {
  mode: GameMode;
  time?: 15 | 30 | 60 | 120;
  wordCount?: 10 | 25 | 50 | 100;
  language: "english" | "spanish";
};

type SessionResult = {
  date: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  mode: GameMode;
  duration?: number;
  wordCount?: number;
  language: string;
  chars: number;
  errors: number;
};
```

---

## 12. Estado actual vs plan original

### ✅ Completado

- Setup del proyecto (Bun + TypeScript + @opentui/core)
- `engine/typing.ts`: estados de letras, detección de errores, navegación entre palabras
- `engine/timer.ts`: countdown para modo tiempo
- `engine/wpm.ts`: cálculo de WPM y accuracy
- Modo tiempo funcional (15s · 30s · 60s · 120s)
- Modo palabras (10 · 25 · 50 · 100)
- Menú con selección de modo y opciones
- Pantalla de resultados con estadísticas completas
- Gráfica WPM con chart() (barras █, eje Y, colores)
- Trend chart compacto con sparkArea() (3 líneas)
- Navegación entre pantallas (Tab reinicia, Esc menú)
- Vim-style key bindings (h/l/j/k)
- Paginación en historial (← → / h l)
- `lib/db.ts`: guardado de resultados en SQLite con bun:sqlite
- Historial con stats globales, desglose por modo, trend chart
- Detalle de sesión con resultados + chart
- **Arquitectura modular**: `screens/menu|game|results|history.ts`, `ui/theme|chart|word-display.ts`, `lib/wordlists|state|config.ts`
- **State extraction**: estado global y transiciones en `lib/state.ts`
- **Barrel file**: `screens.ts` como barrel puro (7 re-exports)
- 115 tests unitarios (strict TDD)
- Typecheck estricto
- SDD formal con 6 chained PRs (artifacts en `openspec/changes/`)
- Judgment Day con dual review

### 🔜 Pendiente

- Modo citas (colección local)
- CLI flags (`--time`, `--words`, `--quotes`, `--lang`, `--history`)
- Publicación en npm (`bun publish`)
- Build de binarios con `bun build --compile` (binario standalone funcional)
- Sistema de temas (Dracula, Nord, Catppuccin...)
- Wordlists custom por archivo
- Modo código (snippets de JS, Python, etc.)
- Config persistente (`lib/config.ts` — shell listo para implementar)
- Comparación vs promedio en pantalla de resultados

---

## 13. Criterios de aceptación del MVP

El MVP se considera completo cuando:

1. `bun install -g monkeyterm` o descargar el binary compilado instala la herramienta sin errores.
2. Los tres modos de juego (tiempo, palabras, citas) funcionan correctamente.
3. WPM, accuracy y errores se calculan y muestran correctamente.
4. Los resultados se guardan localmente y son visibles en el historial.
5. La gráfica de progreso muestra las últimas 20 sesiones.
6. La configuración persiste entre sesiones.
7. Tab reinicia, Esc vuelve al menú, Ctrl+Backspace borra palabra.
8. La app no crashea ante inputs inesperados ni terminales de tamaño no estándar.

---

_Monkeyterm — PRD v1.1 — Stack: Bun + OpenTUI Core — Actualizado: 2026-05-29_
