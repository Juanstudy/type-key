# Menu Navigation Specification

## Purpose

Main menu mode cycling: user cycles through available game modes (time, words, quote) with a single key press.

## Requirements

### Requirement: Mode Cycling

The system MUST cycle through all available modes using a single key press, wrapping from last to first.

#### Scenario: Cycle forward through modes

- GIVEN the user is on the menu screen
- WHEN the mode-toggle key is pressed
- THEN the selection advances to the next mode in order: time → words → quote → time

#### Scenario: Wrap from last to first mode

- GIVEN the user has quote mode selected
- WHEN the mode-toggle key is pressed
- THEN the selection wraps to time mode

### Requirement: Mode Display

The system MUST visually indicate the currently selected mode on the menu screen.

#### Scenario: Selected mode highlighted

- GIVEN three modes are available
- WHEN a mode is selected
- THEN the selected mode is visually highlighted
- AND unselected modes appear dimmed

#### Scenario: Mode count reflects available modes

- GIVEN the menu renders
- WHEN modes are displayed
- THEN all three modes (time, words, quote) are shown
- AND the indicator shows current position (e.g., 2/3)

### Requirement: Mode Confirmation

The system MUST start the selected game mode when the user confirms their selection.

#### Scenario: Start selected mode

- GIVEN quote mode is selected
- WHEN the user presses confirm/enter
- THEN a quote-mode session starts
- AND the menu screen is replaced by the game screen
