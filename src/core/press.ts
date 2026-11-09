// Tells a long press from everything else a pointer might be doing. It only
// knows about ids, coordinates and time, so the browser's quirks stay in peek.

export interface PressTimers {
	set(callback: () => void, ms: number): number;
	clear(id: number): void;
}

export interface PressOptions {
	onFire: () => void;
	/** The press ended without firing. */
	onCancel: () => void;
	/** How long to hold, in ms. */
	delay?: number;
	/** How far the pointer may wander while holding, in px. */
	tolerance?: number;
	timers?: PressTimers;
}

const browserTimers: PressTimers = {
	set: (callback, ms) => setTimeout(callback, ms) as unknown as number,
	clear: (id) => clearTimeout(id),
};

export class Press {
	private options: PressOptions;
	private id: number | null = null;
	private x = 0;
	private y = 0;
	private timer = 0;

	constructor(options: PressOptions) {
		this.options = options;
	}

	get active(): boolean {
		return this.id !== null;
	}

	/** Starts timing, unless another pointer already is. Returns whether it did. */
	down(id: number, x: number, y: number): boolean {
		if (this.id !== null) return false;
		this.id = id;
		this.x = x;
		this.y = y;
		const { delay = 450, timers = browserTimers } = this.options;
		this.timer = timers.set(() => this.fire(), delay);
		return true;
	}

	move(id: number, x: number, y: number): void {
		if (id !== this.id) return;
		const { tolerance = 8 } = this.options;
		if (Math.hypot(x - this.x, y - this.y) > tolerance) this.cancel();
	}

	up(id: number): void {
		if (id === this.id) this.cancel();
	}

	/** Gives up on the current press, if there is one. */
	cancel(): void {
		if (!this.clear()) return;
		this.options.onCancel();
	}

	/** Fires now without waiting for the timer. */
	fire(): void {
		if (!this.clear()) return;
		this.options.onFire();
	}

	private clear(): boolean {
		if (this.id === null) return false;
		this.id = null;
		const { timers = browserTimers } = this.options;
		timers.clear(this.timer);
		return true;
	}
}
