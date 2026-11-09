import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Press } from "./press";

function setup() {
	const onFire = vi.fn();
	const onCancel = vi.fn();
	return { press: new Press({ onFire, onCancel }), onFire, onCancel };
}

describe("Press", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("fires after 450ms", () => {
		const { press, onFire } = setup();
		press.down(1, 0, 0);
		vi.advanceTimersByTime(449);
		expect(onFire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onFire).toHaveBeenCalledOnce();
		expect(press.active).toBe(false);
	});

	it("allows 8px of wander", () => {
		const { press, onFire, onCancel } = setup();
		press.down(1, 10, 10);
		press.move(1, 18, 10);
		expect(onCancel).not.toHaveBeenCalled();
		vi.advanceTimersByTime(450);
		expect(onFire).toHaveBeenCalledOnce();
	});

	it("cancels past 8px and stays cancelled", () => {
		const { press, onFire, onCancel } = setup();
		press.down(1, 10, 10);
		press.move(1, 19, 10);
		expect(onCancel).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(450);
		expect(onFire).not.toHaveBeenCalled();
	});

	it("cancels on early release", () => {
		const { press, onFire, onCancel } = setup();
		press.down(1, 0, 0);
		press.up(1);
		vi.advanceTimersByTime(450);
		expect(onCancel).toHaveBeenCalledOnce();
		expect(onFire).not.toHaveBeenCalled();
	});

	it("only follows the pointer that started it", () => {
		const { press, onCancel } = setup();
		press.down(1, 0, 0);
		expect(press.down(2, 50, 50)).toBe(false);
		press.move(2, 500, 500);
		press.up(2);
		expect(onCancel).not.toHaveBeenCalled();
		expect(press.active).toBe(true);
	});

	it("can fire early, once", () => {
		const { press, onFire } = setup();
		press.down(1, 0, 0);
		press.fire();
		vi.advanceTimersByTime(450);
		expect(onFire).toHaveBeenCalledOnce();
	});

	it("does nothing when there's no press to cancel", () => {
		const { press, onCancel } = setup();
		press.cancel();
		expect(onCancel).not.toHaveBeenCalled();
	});
});
