# SDD Proposal: 03-words-mode

## Problem Statement

Currently type-key only supports Time Mode: type as many words as you can in 30s/60s/120s. The `WordCountOption` type (10/25/50/100) already exists in `types.ts` but is unused. Monkeytype's Words Mode is one of its most popular modes.

## Proposed Solution

Add a Words Mode where the user selects a word count (10/25/50/100) and types through all words at their own pace. The timer runs for stats only — the game ends when all words are completed.

## Scope

### In Scope

- Mode selector on menu (Time / Words)
- Words Mode option: select word count
- Engine adapts: game ends when all words completed
- Timer runs in background for WPM calculation
- Results screen works for both modes

### Out of Scope

- Quotes Mode
- History screen
- Leaderboards

## Risks

- Low: Timer + word-complete game-end logic is straightforward
- Low: TypingEngine already supports isComplete()
