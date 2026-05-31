import wordlist from "../data/wordlists/english.json";

export function shuffleWords(count: number): string[] {
	const a = [...wordlist];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		// safe: Fisher-Yates guarantees 0 ≤ j ≤ i < a.length
		const vi = a[i] as string;
		const vj = a[j] as string;
		a[i] = vj;
		a[j] = vi;
	}
	return a.slice(0, count);
}
