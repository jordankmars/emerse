import { config } from "./config";

// Everything that's moving shares one requestAnimationFrame loop. It runs only
// while something is tracked and stops on the first frame with nothing to do.

export interface Animated {
	/** Advance by `dt` seconds. */
	step(dt: number): void;
}

// A dropped frame shouldn't turn into a jump, so cap each step.
const MAX_DT = 1 / 30;

const active = new Set<Animated>();
let raf = 0;
let last = 0;

function tick(now: number) {
	const dt = Math.max(0, Math.min((now - last) / 1000, MAX_DT)) * config.speed;
	last = now;
	// Copy first: an item may untrack itself, or start another, while stepping.
	for (const item of [...active]) item.step(dt);
	raf = active.size ? requestAnimationFrame(tick) : 0;
}

export function track(item: Animated): void {
	active.add(item);
	if (!raf) {
		last = performance.now();
		raf = requestAnimationFrame(tick);
	}
}

export function untrack(item: Animated): void {
	active.delete(item);
}
