import { describe, it, expect } from "bun:test";
import { WPMCalculator } from "./wpm";

describe("WPMCalculator", () => {
	describe("gross WPM", () => {
		it("should calculate gross WPM = (correctChars/5) / minutes", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 50,
				totalChars: 55,
				errors: 5,
				durationMinutes: 1,
			});
			expect(stats.grossWPM).toBe(10); // (50/5) / 1 = 10
		});

		it("should handle 0 duration without dividing by zero", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 50,
				totalChars: 55,
				errors: 5,
				durationMinutes: 0,
			});
			expect(stats.grossWPM).toBe(0);
		});

		it("should handle 0 characters without dividing by zero", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 0,
				totalChars: 0,
				errors: 0,
				durationMinutes: 1,
			});
			expect(stats.grossWPM).toBe(0);
		});

		it("should handle large character counts", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 1000,
				totalChars: 1100,
				errors: 100,
				durationMinutes: 5,
			});
			expect(stats.grossWPM).toBe(40); // (1000/5) / 5 = 40
		});
	});

	describe("raw WPM", () => {
		it("should calculate raw WPM = (totalChars/5) / minutes", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 50,
				totalChars: 55,
				errors: 5,
				durationMinutes: 1,
			});
			expect(stats.rawWPM).toBe(11); // (55/5) / 1 = 11
		});

		it("should handle 0 duration for raw WPM", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 50,
				totalChars: 55,
				errors: 5,
				durationMinutes: 0,
			});
			expect(stats.rawWPM).toBe(0);
		});
	});

	describe("accuracy", () => {
		it("should calculate accuracy = correctChars / totalChars * 100", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 90,
				totalChars: 100,
				errors: 10,
				durationMinutes: 1,
			});
			expect(stats.accuracy).toBe(90);
		});

		it("should handle 100% accuracy", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 100,
				totalChars: 100,
				errors: 0,
				durationMinutes: 1,
			});
			expect(stats.accuracy).toBe(100);
		});

		it("should handle 0% accuracy", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 0,
				totalChars: 100,
				errors: 100,
				durationMinutes: 1,
			});
			expect(stats.accuracy).toBe(0);
		});

		it("should round accuracy to 1 decimal place", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 1000,
				totalChars: 1100,
				errors: 100,
				durationMinutes: 5,
			});
			expect(stats.accuracy).toBe(90.9); // 1000/1100*100 = 90.909... → 90.9
		});

		it("should handle 0 total chars for accuracy", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 0,
				totalChars: 0,
				errors: 0,
				durationMinutes: 1,
			});
			expect(stats.accuracy).toBe(100);
		});
	});

	describe("edge cases", () => {
		it("should handle fractional duration (30 seconds)", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 25,
				totalChars: 30,
				errors: 5,
				durationMinutes: 0.5,
			});
			expect(stats.grossWPM).toBe(10); // (25/5) / 0.5 = 10
		});

		it("should handle zero for all inputs", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 0,
				totalChars: 0,
				errors: 0,
				durationMinutes: 0,
			});
			expect(stats.grossWPM).toBe(0);
			expect(stats.rawWPM).toBe(0);
			expect(stats.accuracy).toBe(100);
		});

		it("should return all expected fields", () => {
			const calculator = new WPMCalculator();
			const stats = calculator.calculate({
				correctChars: 50,
				totalChars: 55,
				errors: 5,
				durationMinutes: 1,
			});
			expect(stats).toHaveProperty("grossWPM");
			expect(stats).toHaveProperty("rawWPM");
			expect(stats).toHaveProperty("accuracy");
		});
	});
});
