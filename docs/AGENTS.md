# Code Review Rules — type-key (Monkeyterm)

## ALL FILES

REJECT if:

- Hardcoded secrets, tokens, or credentials
- `any` type used without `// @ts-expect-error` justification
- `console.log` in production code (use renderer or structured logging)
- Empty `catch` blocks (silent error swallowing)
- Dead code or commented-out blocks
- Files over 300 lines without justification
- `import * as` namespace imports — use named imports

REQUIRE:

- Descriptive variable and function names (no single-letter except loop indices)
- Error messages that help debugging
- Typed function signatures on all exported functions

PREFER:

- Early returns over nested ifs
- Pure functions over mutating state
- `const` over `let` when possible

---

## TypeScript

REJECT if:

- `any` type (use `unknown` + type guards instead)
- Missing return types on exported functions
- Type assertions (`as X`) without a comment explaining why the assertion is safe
- `enum` keyword — use `as const` objects with union types instead
- `!` non-null assertion (use early return or type guard)
- `{}` as type (use `Record<string, never>` or `object`)

REQUIRE:

- Discriminated unions for state machines
- Exhaustive switch/if-else for union type variants
- `satisfies` over `as` for type validation
- `noUncheckedIndexedAccess` respected: check for `undefined` on indexed access

PREFER:

- Branded types for domain primitives (e.g., `WPM`, `Accuracy`)
- `ReadonlyArray<T>` over `T[]` for immutable params
- Type imports using `import type { ... }`

---

## Bun + ESM

REJECT if:

- CommonJS (`require()`, `module.exports`)
- `.js` extensions in imports (Bun resolves `.ts` automatically)
- `process.env` access without fallback or validation

REQUIRE:

- `import` / `export` syntax (ESM)
- `Bun.file()` for file I/O over `fs.readFileSync`
- `bun:test` for test files (`describe`, `it`, `expect`)

PREFER:

- Top-level `await` over `.then()`
- `Bun.write()` for output files
- `new Response()` for stream-based data

---

## OpenTUI

REJECT if:

- Direct `console.log` for UI rendering (use `renderer.root.add(...)`)
- Mutating `renderer` state outside of screen lifecycle
- Blocking the main thread with synchronous loops (use `setInterval` or `requestAnimationFrame`-style patterns)
- Mixing Ink/JSX patterns — OpenTUI is imperative

REQUIRE:

- `renderer.destroy()` on cleanup / exit paths
- `CliRenderer` type imported from `@opentui/core`
- Component functions return `Element` or `Component` from OpenTUI

PREFER:

- Composition: build complex views from small component functions
- `Text()`, `Box()`, `Stack()` over raw string output
- Event-driven updates (rerender on state change, not polling)

---

## Strict TDD

This project uses **strict TDD** mode. All implementation must follow:

1. **RED**: Write a failing test first
2. **GREEN**: Write the minimum code to pass
3. **TRIANGULATE**: Add more test cases to generalize
4. **REFACTOR**: Clean up without changing behavior

REJECT if:

- Code committed without a corresponding test
- Test file missing for new source files under `src/engine/`, `src/lib/`, `src/screens/`
- Tests that don't actually assert (no `expect()` calls)
- Snapshot tests as the only assertion
- Tests that depend on external state (filesystem, timers) without proper setup/teardown

REQUIRE:

- Test files co-located with source: `src/engine/foo.ts` → `src/engine/foo.test.ts`
- `bun test` command passes before commit
- Unit tests for all engine/domain logic (no OpenTUI dependency in unit tests)
- Edge cases: empty state, boundary values, error paths

PREFER:

- `describe`/`it` blocks for readable test output
- `beforeEach`/`afterEach` for shared setup
- Mocking only external IO (files, timers), not internal modules
- Property-based or table-driven tests for repetitive cases

---

## Project Structure

REJECT if:

- Circular dependencies between modules
- Business logic inside UI components (screens should delegate to engine/lib)
- Files outside their designated directory (`engine/`, `lib/`, `screens/`, `ui/`, `data/`)
- Direct `import` from `src/data/` wordlists/quotes in screen code (use engine layer)

REQUIRE:

- Screens own rendering + input handling only
- Engine owns game logic, scoring, timer
- Lib owns helpers, formatting, utilities
- Data owns wordlists, quotes, static resources

PREFER:

- `@/` path alias over relative imports (`@/engine/timer` over `../../engine/timer`)

---

## Response Format

FIRST LINE must be exactly:

STATUS: PASSED

or

STATUS: FAILED

If FAILED, list violations as:

`path/to/file.ts:line - rule category - what to fix`
