# Mode Quote Specification

## Purpose

Quote-mode game flow: random quote selection, typing with elapsed-time tracking, completion, and results with source attribution.

## Requirements

### Requirement: Quote Selection

The system MUST load a random quote from the curated collection matching the user's language before game start.

#### Scenario: Random quote loaded successfully

- GIVEN quotes exist for the current language
- WHEN quote mode starts
- THEN a random quote is selected
- AND the quote text is converted to a Word[] array

#### Scenario: No quotes available for language

- GIVEN no quotes exist for the current language
- WHEN quote mode starts
- THEN the system falls back to words-mode behavior
- AND displays a warning message

### Requirement: Elapsed-Time Display

The system MUST display elapsed time (count-up) instead of countdown during quote-mode sessions.

#### Scenario: Timer starts on first keystroke

- GIVEN a quote-mode session is active
- WHEN the user types the first character
- THEN the elapsed timer starts from 00:00
- AND increments every second

#### Scenario: Timer shows during typing

- GIVEN the elapsed timer is running
- WHEN the user continues typing
- THEN the header displays elapsed time in MM:SS format

### Requirement: Quote Typing Flow

The system MUST reuse the existing typing engine with the quote text as a pre-built Word[] array.

#### Scenario: User types quote text

- GIVEN a quote is displayed
- WHEN the user types characters
- THEN correct characters appear green, incorrect appear red
- AND space advances to the next word

#### Scenario: User completes entire quote

- GIVEN the user is typing a quote
- WHEN all words in the quote are completed
- THEN the session ends
- AND transitions to the results screen

### Requirement: Results with Attribution

The system MUST display the quote text and source attribution on the results screen.

#### Scenario: Results show quote attribution

- GIVEN a quote-mode session completed
- WHEN the results screen renders
- THEN WPM, accuracy, and elapsed time are shown
- AND the quote source is displayed below stats

#### Scenario: Long quote truncation in results

- GIVEN the quote text exceeds terminal width
- WHEN the results screen renders
- THEN the quote is truncated with ellipsis
- AND the full source remains visible
