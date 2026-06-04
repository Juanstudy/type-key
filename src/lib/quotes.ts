import type { Language, Quote } from "@/lib/types";
import enQuotes from "@/data/quotes/english.json";
import esQuotes from "@/data/quotes/spanish.json";

const quoteCache: Record<Language, Quote[]> = {
	english: enQuotes as Quote[],
	spanish: esQuotes as Quote[],
};

/**
 * Get a random quote for the given language.
 * Returns null if no quotes exist for that language.
 */
export function getRandomQuote(lang: Language): Quote | null {
	const quotes = quoteCache[lang];
	if (!quotes || quotes.length === 0) return null;
	const idx = Math.floor(Math.random() * quotes.length);
	// safe: idx is guaranteed 0 ≤ idx < quotes.length
	const quote = quotes[idx] as Quote;
	return quote;
}

/**
 * Split a quote's text into individual words for the typing engine.
 * Filters out empty strings from multiple spaces.
 */
export function quoteToWords(quote: Quote): string[] {
	return quote.text.split(/\s+/).filter(Boolean);
}
