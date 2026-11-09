// A damped spring described the way designers think about it: how long it takes
// to arrive, and how much it overshoots. Bounce 0 is critically damped.

export interface SpringOptions {
	/** Seconds to roughly settle. */
	duration: number;
	/** 0 for no overshoot, up to 1 for a lot. */
	bounce: number;
}

export interface SpringState {
	/** Current value. */
	x: number;
	/** Current velocity, in units per second. */
	v: number;
	/** Target value. */
	to: number;
}

export interface SpringConstants {
	/** Stiffness. */
	k: number;
	/** Damping. */
	c: number;
}

// Integrate in small fixed slices so a long frame can't blow the spring up.
const STEPS_PER_SECOND = 600;

export function springConstants({
	duration,
	bounce,
}: SpringOptions): SpringConstants {
	return {
		k: ((2 * Math.PI) / duration) ** 2,
		c: (4 * Math.PI * (1 - bounce)) / duration,
	};
}

/** Advances a spring by `dt` seconds in place (semi-implicit Euler). */
export function stepSpring(
	s: SpringState,
	{ k, c }: SpringConstants,
	dt: number,
): void {
	if (dt <= 0) return;
	const n = Math.ceil(dt * STEPS_PER_SECOND);
	const h = dt / n;
	for (let i = 0; i < n; i++) {
		s.v += (-k * (s.x - s.to) - c * s.v) * h;
		s.x += s.v * h;
	}
}

/**
 * Close enough to the target, and slow enough, that nobody can tell. `rest` is
 * in the spring's own units, so a 0 to 1 scale can ask for more than pixels do.
 */
export function isSettled(s: SpringState, rest: number): boolean {
	return Math.abs(s.x - s.to) < rest && Math.abs(s.v) < rest * 10;
}
