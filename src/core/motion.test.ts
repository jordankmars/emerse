import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure } from "./config";
import { Motion } from "./motion";

const SPRING = { duration: 0.45, bounce: 0, rest: 0.001 };

function run(m: Motion, seconds: number) {
	for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60);
}

describe("Motion", () => {
	beforeEach(() => {
		vi.stubGlobal("requestAnimationFrame", () => 1);
		configure({ reduced: false });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		configure({ reduced: null });
	});

	it("reports each value and lands exactly on the target", () => {
		const on = vi.fn();
		const m = new Motion(1, SPRING, on);
		m.set(0.95);
		run(m, 2);
		expect(m.x).toBe(0.95);
		expect(on).toHaveBeenLastCalledWith(0.95);
	});

	it("does not stop early on a small range", () => {
		const on = vi.fn();
		const m = new Motion(0, SPRING, on);
		m.set(1);
		m.step(1 / 60);
		expect(m.x).toBeLessThan(0.5);
		expect(m.x).not.toBe(1);
	});

	it("calls onRest only once", () => {
		const done = vi.fn();
		const m = new Motion(0, SPRING, () => {});
		m.onRest = done;
		m.set(1);
		run(m, 2);
		m.jump(0);
		expect(done).toHaveBeenCalledTimes(1);
	});

	it("keeps its velocity when retargeted", () => {
		const m = new Motion(0, SPRING, () => {});
		m.set(1);
		run(m, 0.1);
		const { v } = m;
		m.set(0);
		expect(m.v).toBe(v);
	});

	it("jumps under reduced motion", () => {
		configure({ reduced: true });
		const done = vi.fn();
		const m = new Motion(0, SPRING, () => {});
		m.onRest = done;
		m.set(1);
		expect(m.x).toBe(1);
		expect(done).toHaveBeenCalledOnce();
	});
});
