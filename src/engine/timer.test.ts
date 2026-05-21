import { describe, it, expect, mock } from "bun:test";
import { Timer } from "./timer";

describe("Timer", () => {
	describe("lifecycle", () => {
		it("should be running after start()", () => {
			const onStart = mock(() => {});
			const timer = new Timer(60, {
				onStart,
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			expect(timer.isRunning()).toBe(true);
		});

		it("should not be running before start()", () => {
			const timer = new Timer(60, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			expect(timer.isRunning()).toBe(false);
		});

		it("should call onStart callback immediately on start", () => {
			const onStart = mock(() => {});
			const timer = new Timer(60, {
				onStart,
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			expect(onStart).toHaveBeenCalledTimes(1);
		});

		it("should call onTick after each interval", async () => {
			const onTick = mock(() => {});
			const timer = new Timer(
				1,
				{ onStart: mock(() => {}), onTick, onComplete: mock(() => {}) },
				10, // 10ms interval for fast testing
			);
			timer.start();
			// Wait for at least one tick (generous margin to avoid flakiness in CI)
			await Bun.sleep(30);
			expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(1);
			// onTick should receive remaining seconds (rounded)
			// 1 second timer with 10ms interval means remaining = 1 - 0.01
			timer.stop();
		});

		it("should call onComplete when timer reaches 0", async () => {
			const onComplete = mock(() => {});
			const timer = new Timer(
				0.01, // very short: 0.01 seconds
				{ onStart: mock(() => {}), onTick: mock(() => {}), onComplete },
				5, // 5ms interval
			);
			timer.start();
			await Bun.sleep(30);
			expect(onComplete).toHaveBeenCalledTimes(1);
			timer.stop();
		});

		it("should stop timer on stop()", () => {
			const timer = new Timer(60, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			expect(timer.isRunning()).toBe(true);
			timer.stop();
			expect(timer.isRunning()).toBe(false);
		});

		it("should reset elapsed time on stop()", () => {
			const timer = new Timer(60, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			// Stop should reset
			timer.stop();
			expect(timer.getRemainingSeconds()).toBeCloseTo(60, 0);
		});
	});

	describe("stop and resume interaction", () => {
		it("should allow resume after stop (regression: completed flag was not reset)", () => {
			const timer = new Timer(60, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			timer.stop();
			// After stop, completed=true. Resume must clear it to tick again.
			timer.resume();
			expect(timer.isRunning()).toBe(true);
			timer.stop();
		});

		it("should tick after stop + resume (regression: completed guard blocked ticks)", async () => {
			const onTick = mock(() => {});
			const timer = new Timer(
				1,
				{ onStart: mock(() => {}), onTick, onComplete: mock(() => {}) },
				10,
			);
			timer.start();
			await Bun.sleep(15);
			timer.stop();
			timer.resume();
			await Bun.sleep(30);
			expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(1);
			timer.stop();
		});
	});

	describe("pause and resume", () => {
		it("should pause timer on pause()", () => {
			const timer = new Timer(60, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			timer.pause();
			expect(timer.isRunning()).toBe(false);
		});

		it("should resume timer on resume()", () => {
			const timer = new Timer(60, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			timer.pause();
			expect(timer.isRunning()).toBe(false);
			timer.resume();
			expect(timer.isRunning()).toBe(true);
		});

		it("should not tick while paused", async () => {
			const onTick = mock(() => {});
			const timer = new Timer(
				60,
				{ onStart: mock(() => {}), onTick, onComplete: mock(() => {}) },
				10,
			);
			timer.start();
			await Bun.sleep(5);
			timer.pause();
			const tickCountBefore = onTick.mock.calls.length;
			await Bun.sleep(20);
			// Should not have ticked while paused
			expect(onTick.mock.calls.length).toBe(tickCountBefore);
			timer.stop();
		});
	});

	describe("time tracking", () => {
		it("should return initial duration as remaining seconds", () => {
			const timer = new Timer(30, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			expect(timer.getRemainingSeconds()).toBe(30);
		});

		it("should decrease remaining seconds over time", async () => {
			const timer = new Timer(
				0.1, // 100ms total
				{
					onStart: mock(() => {}),
					onTick: mock(() => {}),
					onComplete: mock(() => {}),
				},
				10, // 10ms interval
			);
			timer.start();
			await Bun.sleep(15);
			const remaining = timer.getRemainingSeconds();
			expect(remaining).toBeLessThan(0.1);
			expect(remaining).toBeGreaterThanOrEqual(0);
			timer.stop();
		});

		it("should return 0 remaining when timer completes", async () => {
			const timer = new Timer(
				0.01,
				{
					onStart: mock(() => {}),
					onTick: mock(() => {}),
					onComplete: mock(() => {}),
				},
				5,
			);
			timer.start();
			await Bun.sleep(30);
			expect(timer.getRemainingSeconds()).toBe(0);
			timer.stop();
		});
	});

	describe("edge cases", () => {
		it("should handle 0 duration without crashing", () => {
			const timer = new Timer(0, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			expect(() => timer.start()).not.toThrow();
		});

		it("should immediately complete with 0 duration", async () => {
			const onComplete = mock(() => {});
			const timer = new Timer(0, {
				onStart: mock(() => {}),
				onTick: mock(() => {}),
				onComplete,
			});
			timer.start();
			await Bun.sleep(10);
			expect(onComplete).toHaveBeenCalledTimes(1);
			timer.stop();
		});

		it("should not call onComplete multiple times", async () => {
			const onComplete = mock(() => {});
			const timer = new Timer(
				0.01,
				{ onStart: mock(() => {}), onTick: mock(() => {}), onComplete },
				5,
			);
			timer.start();
			await Bun.sleep(50);
			expect(onComplete).toHaveBeenCalledTimes(1);
			timer.stop();
		});

		it("should allow restart after stop", () => {
			const onStart = mock(() => {});
			const timer = new Timer(60, {
				onStart,
				onTick: mock(() => {}),
				onComplete: mock(() => {}),
			});
			timer.start();
			timer.stop();
			timer.start();
			expect(onStart).toHaveBeenCalledTimes(2);
		});
	});
});
