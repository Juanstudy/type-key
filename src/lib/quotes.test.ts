import { describe, it, expect } from "bun:test";
import { getRandomQuote, quoteToWords } from "@/lib/quotes";
import type { Quote } from "@/lib/types";

describe("getRandomQuote", () => {
	it("should return a quote with text, source, and length", () => {
		const quote = getRandomQuote("english");
		expect(quote).not.toBeNull();
		expect(quote!.text).toBeString();
		expect(quote!.text.length).toBeGreaterThan(0);
		expect(quote!.source).toBeString();
		expect(quote!.source.length).toBeGreaterThan(0);
		expect(["short", "medium", "long"]).toContain(quote!.length);
	});

	it("should return null for unsupported language", () => {
		// Cast to test edge case — no quotes exist for fictional language
		const quote = getRandomQuote("klingon" as "english");
		expect(quote).toBeNull();
	});

	it("should return different quotes across calls (probabilistic)", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 10; i++) {
			const quote = getRandomQuote("english");
			expect(quote).not.toBeNull();
			seen.add(quote!.text);
		}
		// With 51 quotes, 10 calls should produce at least 2 different ones
		expect(seen.size).toBeGreaterThan(1);
	});

	it("should work for spanish", () => {
		const quote = getRandomQuote("spanish");
		expect(quote).not.toBeNull();
		expect(quote!.text).toBeString();
		expect(quote!.source).toBeString();
	});
});

describe("quoteToWords", () => {
	it("should split a quote into words", () => {
		const quote: Quote = {
			text: "Hello world from space",
			source: "Test",
			length: "short",
		};
		const words = quoteToWords(quote);
		expect(words).toEqual(["Hello", "world", "from", "space"]);
	});

	it("should handle multiple spaces", () => {
		const quote: Quote = {
			text: "hello   world  test",
			source: "Test",
			length: "short",
		};
		const words = quoteToWords(quote);
		expect(words).toEqual(["hello", "world", "test"]);
	});

	it("should handle leading and trailing spaces", () => {
		const quote: Quote = {
			text: "  hello world  ",
			source: "Test",
			length: "short",
		};
		const words = quoteToWords(quote);
		expect(words).toEqual(["hello", "world"]);
	});

	it("should handle single word quotes", () => {
		const quote: Quote = {
			text: "Solitude",
			source: "Test",
			length: "short",
		};
		const words = quoteToWords(quote);
		expect(words).toEqual(["Solitude"]);
	});

	it("should handle empty text gracefully", () => {
		const quote: Quote = {
			text: "",
			source: "Test",
			length: "short",
		};
		const words = quoteToWords(quote);
		expect(words).toEqual([]);
	});
});
