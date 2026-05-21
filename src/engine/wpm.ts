export interface WPMInput {
	correctChars: number;
	totalChars: number;
	errors: number;
	durationMinutes: number;
}

export interface WPMStats {
	grossWPM: number;
	rawWPM: number;
	accuracy: number;
}

export class WPMCalculator {
	calculate(input: WPMInput): WPMStats {
		const { correctChars, totalChars, durationMinutes } = input; // errors field accepted but not used in formula

		// Gross WPM: (correct characters / 5) / minutes
		const grossWPM =
			durationMinutes > 0 ? Math.round(correctChars / 5 / durationMinutes) : 0;

		// Raw WPM: (total characters / 5) / minutes
		const rawWPM =
			durationMinutes > 0 ? Math.round(totalChars / 5 / durationMinutes) : 0;

		// Accuracy: correct / total * 100, rounded to 1 decimal
		const accuracy =
			totalChars > 0
				? Math.round((correctChars / totalChars) * 1000) / 10
				: 100;

		return { grossWPM, rawWPM, accuracy };
	}
}
