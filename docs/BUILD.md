# Build Instructions — Monkeyterm

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Zig](https://ziglang.org) >= 0.14 (required by `@opentui/core` for native build)

### Installing Zig

```bash
# Linux/macOS
curl -fsSL https://ziglang.org/download/0.14.0/zig-linux-x86_64-0.14.0.tar.xz -o /tmp/zig.tar.xz
mkdir -p ~/.local/share/zig
tar -xf /tmp/zig.tar.xz --strip-components=1 -C ~/.local/share/zig/
export PATH="$HOME/.local/share/zig:$PATH"
```

## Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun dev

# Or directly
bun run src/index.ts
```

## Build

```bash
# Compile to standalone binary
bun build ./src/index.ts --compile --outfile monkeyterm

# Run the binary
./monkeyterm
```

## Install globally

```bash
bun install -g .
monkeyterm
```

## Type checking

```bash
bun run typecheck
```
