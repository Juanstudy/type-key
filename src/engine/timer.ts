export interface TimerCallbacks {
	onStart: () => void;
	onTick: (remainingSeconds: number) => void;
	onComplete: () => void;
}

export class Timer {
	private durationSeconds: number;
	private callbacks: TimerCallbacks;
	private intervalMs: number;
	private elapsedMs: number;
	private running: boolean;
	private intervalId: ReturnType<typeof setInterval> | null;
	private startTimestamp: number | null;

	constructor(
		durationSeconds: number,
		callbacks: TimerCallbacks,
		intervalMs: number = 1000,
	) {
		this.durationSeconds = durationSeconds;
		this.callbacks = callbacks;
		this.intervalMs = intervalMs;
		this.elapsedMs = 0;
		this.running = false;
		this.intervalId = null;
		this.startTimestamp = null;
	}

	start(): void {
		// Stop any existing timer
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.elapsedMs = 0;
		this.running = true;
		this.callbacks.onStart();

		// Handle 0 duration: complete immediately
		if (this.durationSeconds <= 0) {
			this.elapsedMs = 0;
			this.running = false;
			this.callbacks.onTick(0);
			this.callbacks.onComplete();
			return;
		}

		this.startTimestamp = Date.now();
		this.intervalId = setInterval(() => {
			this.elapsedMs = Date.now() - this.startTimestamp!;
			const remaining = Math.max(
				0,
				this.durationSeconds * 1000 - this.elapsedMs,
			);

			this.callbacks.onTick(remaining / 1000);

			if (remaining <= 0) {
				this.running = false;
				if (this.intervalId !== null) {
					clearInterval(this.intervalId);
					this.intervalId = null;
				}
				this.elapsedMs = this.durationSeconds * 1000;
				this.callbacks.onComplete();
			}
		}, this.intervalMs);
	}

	pause(): void {
		if (!this.running) return;
		this.running = false;
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		// Capture elapsed time so far
		if (this.startTimestamp !== null) {
			this.elapsedMs = Date.now() - this.startTimestamp;
		}
	}

	resume(): void {
		if (this.running) return;
		this.running = true;
		this.startTimestamp = Date.now();

		this.intervalId = setInterval(() => {
			this.elapsedMs += Date.now() - this.startTimestamp!;
			this.startTimestamp = Date.now();
			const remaining = Math.max(
				0,
				this.durationSeconds * 1000 - this.elapsedMs,
			);

			this.callbacks.onTick(remaining / 1000);

			if (remaining <= 0) {
				this.running = false;
				if (this.intervalId !== null) {
					clearInterval(this.intervalId);
					this.intervalId = null;
				}
				this.elapsedMs = this.durationSeconds * 1000;
				this.callbacks.onComplete();
			}
		}, this.intervalMs);
	}

	stop(): void {
		this.running = false;
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.elapsedMs = 0;
		this.startTimestamp = null;
	}

	isRunning(): boolean {
		return this.running;
	}

	getRemainingSeconds(): number {
		const remaining = this.durationSeconds * 1000 - this.elapsedMs;
		return Math.max(0, remaining) / 1000;
	}
}
