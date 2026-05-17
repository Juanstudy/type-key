import type { LetterState } from "../lib/types";
import type { Word } from "../lib/types";

export interface GameState {
	words: Word[];
	currentWordIndex: number;
	totalChars: number;
	correctChars: number;
	errors: number;
	isComplete: boolean;
}

export class TypingEngine {
	private words: Word[];
	private currentWordIndex: number;
	private totalChars: number;
	private correctChars: number;
	private errors: number;
	/** How many characters have been typed for the current word (including extra) */
	private charsTypedInCurrentWord: number;

	constructor(words: string[]) {
		this.words = words.map((w) => ({
			letters: w.split("").map((c) => ({ char: c, state: "untyped" as LetterState })),
			hasError: false,
			isCompleted: false,
		}));
		this.currentWordIndex = 0;
		this.totalChars = 0;
		this.correctChars = 0;
		this.errors = 0;
		this.charsTypedInCurrentWord = 0;
	}

	type(char: string): void {
		if (this.isComplete() || this.words.length === 0) {
			return;
		}

		const currentWord = this.words[this.currentWordIndex]!;

		// Space advances to next word only if current word is fully typed
		if (char === " ") {
			if (currentWord.isCompleted) {
				this.currentWordIndex++;
				this.charsTypedInCurrentWord = 0;
			}
			return;
		}

		const originalLetterCount = this.words[this.currentWordIndex]!.letters.length;

		// Typing within the word bounds
		if (this.charsTypedInCurrentWord < originalLetterCount) {
			const expectedChar = currentWord.letters[this.charsTypedInCurrentWord]!.char;
			if (char === expectedChar) {
				currentWord.letters[this.charsTypedInCurrentWord]!.state = "correct";
				this.correctChars++;
			} else {
				currentWord.letters[this.charsTypedInCurrentWord]!.state = "incorrect";
				this.errors++;
				currentWord.hasError = true;
			}
		} else {
			// Extra character beyond word length
			currentWord.letters.push({ char, state: "extra" });
		}

		this.totalChars++;
		this.charsTypedInCurrentWord++;

		// Mark word as completed when we've typed at least as many chars as the original word length
		if (this.charsTypedInCurrentWord >= originalLetterCount) {
			currentWord.isCompleted = true;
		}
	}

	backspace(): void {
		if (this.words.length === 0) {
			return;
		}

		// Can't backspace if no chars typed in current word
		if (this.charsTypedInCurrentWord <= 0) {
			return;
		}

		const currentWord = this.words[this.currentWordIndex]!;
		const originalLetterCount = this.words[this.currentWordIndex]!.letters.length;

		this.charsTypedInCurrentWord--;
		this.totalChars--;

		const pos = this.charsTypedInCurrentWord;

		if (pos < originalLetterCount) {
			// Reset a letter within the word bounds
			const letter = currentWord.letters[pos]!;
			if (letter.state === "incorrect") {
				this.errors--;
				currentWord.hasError = this.hasAnyErrorInWord(currentWord);
			} else if (letter.state === "correct") {
				this.correctChars--;
			}
			letter.state = "untyped";

			// Word might no longer be completed
			currentWord.isCompleted = false;
		} else {
			// Remove an extra character
			currentWord.letters.pop();
		}
	}

	getGameState(): GameState {
		return {
			words: this.words,
			currentWordIndex: this.currentWordIndex,
			totalChars: this.totalChars,
			correctChars: this.correctChars,
			errors: this.errors,
			isComplete: this.isComplete(),
		};
	}

	isComplete(): boolean {
		return this.currentWordIndex >= this.words.length;
	}

	private hasAnyErrorInWord(word: Word): boolean {
		return word.letters.some((l) => l.state === "incorrect");
	}
}
