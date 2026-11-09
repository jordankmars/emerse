import { isReduced } from "./config";
import { type Animated, track, untrack } from "./frame";
import {
	isSettled,
	type SpringConstants,
	type SpringOptions,
	springConstants,
	stepSpring,
} from "./spring";

export interface MotionOptions extends SpringOptions {
	/** How close counts as arrived, in the units this value moves in. */
	rest: number;
}

/** One number on a spring, handing every new value to `on`. */
export class Motion implements Animated {
	x: number;
	v = 0;
	to: number;
	/** Called once, the next time this comes to rest. */
	onRest: (() => void) | null = null;
	private constants: SpringConstants;
	private rest: number;
	private on: (x: number) => void;

	constructor(x: number, options: MotionOptions, on: (x: number) => void) {
		this.x = this.to = x;
		this.constants = springConstants(options);
		this.rest = options.rest;
		this.on = on;
	}

	/** Heads for `to`, keeping whatever velocity it already has. */
	set(to: number): void {
		this.to = to;
		if (isReduced()) {
			this.jump(to);
			return;
		}
		track(this);
	}

	/** Lands on `x` right away. */
	jump(x: number): void {
		untrack(this);
		this.x = this.to = x;
		this.v = 0;
		this.on(x);
		this.finish();
	}

	/** Stops where it is and forgets the rest callback. */
	stop(): void {
		untrack(this);
		this.v = 0;
		this.onRest = null;
	}

	step(dt: number): void {
		stepSpring(this, this.constants, dt);
		if (!isSettled(this, this.rest)) {
			this.on(this.x);
			return;
		}
		untrack(this);
		this.x = this.to;
		this.v = 0;
		this.on(this.x);
		this.finish();
	}

	private finish(): void {
		const done = this.onRest;
		this.onRest = null;
		done?.();
	}
}
