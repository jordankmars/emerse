// Knobs for the playground and for tests, not public API.

export interface MotionConfig {
	/** Time scale. 0.25 plays everything at quarter speed. */
	speed: number;
	/** Skip the springs. null follows the system setting. */
	reduced: boolean | null;
}

export const config: MotionConfig = {
	speed: 1,
	reduced: null,
};

export function configure(next: Partial<MotionConfig>): void {
	Object.assign(config, next);
}

/** Asked every time something starts moving, so a system change applies right away. */
export function isReduced(): boolean {
	if (config.reduced !== null) return config.reduced;
	if (typeof window === "undefined" || !window.matchMedia) return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
