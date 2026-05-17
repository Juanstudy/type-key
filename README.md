# Monkeyterm 🐒⌨️

> Terminal typing test, inspired by [Monkeytype](https://monkeytype.com/).
> Powered by **Bun** + **OpenTUI** (native Zig core).

## Features

- ⏱️ **Time mode**: 15s / 30s / 60s / 120s
- 📝 **Words mode**: 10 / 25 / 50 / 100 words
- 📖 **Quote mode**: classic quotes to type
- 📊 **Real-time stats**: WPM, accuracy, errors
- 📈 **History**: track your progress with ASCII charts
- 🌙 **Offline**: no account, no internet, no tracking
- ⚡ **Blazing fast**: native Zig rendering, zero overhead

## Quick start

```bash
bun install -g monkeyterm
monkeyterm
```

Or build from source:

```bash
git clone https://github.com/JuanNebbia/type-key
cd type-key
bun install
bun dev
```

## Build standalone binary

```bash
bun build ./src/index.ts --compile --outfile monkeyterm
./monkeyterm
```

## Stack

| Layer    | Tech                       |
| -------- | -------------------------- |
| Runtime  | Bun                        |
| UI       | @opentui/core (native Zig) |
| Database | bun:sqlite                 |
| Charts   | asciichart                 |
| Language | TypeScript 6               |

## License

ISC
