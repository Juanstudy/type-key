import type { TextChunk } from "@opentui/core";
import { CORRECT_FG, INCORRECT_FG, EXTRA_FG } from "./theme";
import type { Letter } from "../lib/types";

export function colored(text: string, color: string): TextChunk {
	return { text, fg: color } as unknown as TextChunk;
}

export function wordText(word: {
	letters: Letter[];
	isCompleted: boolean;
}): TextChunk[] {
	const chunks: TextChunk[] = [];
	for (const letter of word.letters) {
		switch (letter.state) {
			case "correct":
				chunks.push(colored(letter.char, CORRECT_FG));
				break;
			case "incorrect":
				chunks.push(colored(letter.char, INCORRECT_FG));
				break;
			case "extra":
				chunks.push(colored(letter.char, EXTRA_FG));
				break;
			default:
				chunks.push({ text: letter.char } as TextChunk);
				break;
		}
	}
	if (!word.isCompleted) {
		chunks.push({ text: " " } as TextChunk);
	}
	return chunks;
}
