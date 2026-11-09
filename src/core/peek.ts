import { cloneTrigger } from "./clone";
import { config, isReduced } from "./config";
import { Motion } from "./motion";
import { placeMenu } from "./placement";
import { Press } from "./press";

// Press, lift and menu, separate from any framework. Elements are read through
// getters because a framework may not have mounted them yet.

export type Phase = "closed" | "opening" | "open" | "closing";

export interface PeekOptions {
	trigger: () => HTMLElement | null;
	menu: () => HTMLElement | null;
	/**
	 * Mounts or unmounts the menu, and must have applied by the time it returns.
	 * Without it the menu's `hidden` attribute is toggled instead.
	 */
	commit?: (open: boolean) => void;
	/** Which edge of the trigger the menu lines up with. */
	align?: "start" | "end";
	onPhase?: (phase: Phase) => void;
}

const SQUEEZE = { duration: 0.45, bounce: 0, rest: 0.001 };
const LIFT = { duration: 0.45, bounce: 0.35, rest: 0.001 };
const REVEAL = { duration: 0.42, bounce: 0.3, rest: 0.002 };

const PRESSED_SCALE = 0.95;
const LIFTED_SCALE = 1.04;

/** Everything that exists only while the menu is up. */
interface Stage {
	overlay: HTMLElement;
	clone: HTMLElement;
	menu: HTMLElement;
	lift: Motion;
	reveal: Motion;
}

/** Runs `then` once it has been called `count` times. */
function latch(count: number, then: () => void): () => void {
	let left = count;
	return () => {
		if (--left === 0) then();
	};
}

export class Peek {
	phase: Phase = "closed";
	private options: PeekOptions;
	private el: HTMLElement | null = null;
	private stage: Stage | null = null;
	private fadeTimer = 0;
	private visibility = "";
	private press: Press;
	private squeeze: Motion;

	constructor(options: PeekOptions) {
		this.options = options;
		this.squeeze = new Motion(1, SQUEEZE, (s) => {
			if (this.el) this.el.style.transform = s === 1 ? "" : `scale(${s})`;
		});
		this.press = new Press({
			onFire: () => {
				this.unlisten();
				this.show();
			},
			onCancel: () => {
				this.unlisten();
				this.squeeze.set(1);
			},
		});
	}

	/** Starts listening on the trigger. Safe to call more than once. */
	attach(): void {
		const el = this.options.trigger();
		if (!el || el === this.el) return;
		this.detach();
		this.el = el;
		el.addEventListener("pointerdown", this.onPointerDown);
	}

	/** Puts everything back, even if the menu is up. */
	destroy(): void {
		this.teardown();
		this.detach();
	}

	close(): void {
		const { stage } = this;
		if (!stage || this.phase === "closing") return;
		this.set("closing");
		stage.overlay.style.pointerEvents = "none";
		stage.menu.style.pointerEvents = "none";
		const done = latch(3, () => this.finish());
		stage.reveal.onRest = done;
		stage.reveal.set(0);
		stage.lift.onRest = done;
		stage.lift.set(1);
		this.fade(stage, false, done);
	}

	private show(): void {
		if (this.phase === "opening" || this.phase === "open") return;
		const from = this.squeeze.x;
		this.squeeze.jump(1);
		const stage = this.stage ?? this.mount(from);
		if (!stage) return;
		stage.overlay.style.pointerEvents = "";
		stage.menu.style.pointerEvents = "";
		this.set("opening");
		const done = latch(2, () => this.set("open"));
		stage.lift.onRest = done;
		stage.lift.set(LIFTED_SCALE);
		stage.reveal.onRest = done;
		stage.reveal.set(1);
		this.fade(stage, true);
	}

	private mount(from: number): Stage | null {
		const trigger = this.el;
		if (!trigger) return null;
		this.commit(true);
		const menu = this.options.menu();
		if (!menu) {
			this.commit(false);
			return null;
		}

		const overlay = document.createElement("div");
		overlay.dataset.emerseOverlay = "";
		Object.assign(overlay.style, {
			position: "fixed",
			inset: "0",
			opacity: "0",
		});
		overlay.addEventListener("pointerdown", this.onOverlayDown);

		const clone = cloneTrigger(trigger);
		clone.dataset.emerseLifted = "";
		clone.setAttribute("aria-hidden", "true");
		clone.inert = true;
		Object.assign(clone.style, {
			position: "fixed",
			margin: "0",
			maxWidth: "none",
			boxSizing: "border-box",
			pointerEvents: "none",
		});

		const lift = new Motion(from, LIFT, (s) => {
			clone.style.transform = `scale(${s})`;
		});
		const applyReveal = (v: number) => {
			menu.style.opacity = String(Math.min(1, Math.max(0, v)));
			menu.style.transform = `scale(${0.6 + 0.4 * v})`;
		};
		const reveal = new Motion(0, REVEAL, applyReveal);

		const stage = { overlay, clone, menu, lift, reveal };
		this.stage = stage;
		document.body.append(overlay, clone);
		menu.style.position = "fixed";
		this.place(stage, trigger);
		clone.style.transform = `scale(${from})`;
		applyReveal(0);

		this.visibility = trigger.style.visibility;
		trigger.style.visibility = "hidden";
		return stage;
	}

	/** Lines the clone up with the trigger and puts the menu next to it. */
	private place({ clone, menu }: Stage, trigger: HTMLElement): void {
		const rect = trigger.getBoundingClientRect();
		Object.assign(clone.style, {
			left: `${rect.left}px`,
			top: `${rect.top}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
		});

		const rtl = getComputedStyle(trigger).direction === "rtl";
		const end = this.options.align === "end";
		const edge = end !== rtl ? "right" : "left";
		// offsetWidth ignores the scale the menu springs in from.
		const size = { w: menu.offsetWidth, h: menu.offsetHeight };
		const view = { x: 0, y: 0, w: innerWidth, h: innerHeight };
		const { left, top, below } = placeMenu(rect, size, view, edge);
		Object.assign(menu.style, {
			left: `${left}px`,
			top: `${top}px`,
			transformOrigin: `${edge} ${below ? "top" : "bottom"}`,
		});
	}

	private fade({ overlay }: Stage, open: boolean, done?: () => void): void {
		const ms = (isReduced() ? 1 : open ? 200 : 180) / config.speed;
		overlay.style.transition = `opacity ${ms}ms ${open ? "ease-out" : "ease-in"}`;
		// Flush so a fade in has a starting point to transition from.
		void overlay.offsetWidth;
		overlay.style.opacity = open ? "1" : "0";
		clearTimeout(this.fadeTimer);
		if (done) this.fadeTimer = setTimeout(done, ms) as unknown as number;
	}

	private finish(): void {
		const { stage } = this;
		if (!stage) return;
		this.stage = null;
		stage.overlay.remove();
		stage.clone.remove();
		const { style } = stage.menu;
		for (const prop of [
			"position",
			"left",
			"top",
			"opacity",
			"transform",
			"transform-origin",
			"pointer-events",
		]) {
			style.removeProperty(prop);
		}
		if (this.el) this.el.style.visibility = this.visibility;
		this.commit(false);
		this.set("closed");
	}

	/** Drops straight to closed, without animating. */
	private teardown(): void {
		this.press.cancel();
		this.squeeze.jump(1);
		const { stage } = this;
		if (!stage) return;
		clearTimeout(this.fadeTimer);
		stage.lift.stop();
		stage.reveal.stop();
		this.finish();
	}

	private detach(): void {
		this.el?.removeEventListener("pointerdown", this.onPointerDown);
		this.el = null;
	}

	private commit(open: boolean): void {
		const { commit, menu } = this.options;
		if (commit) {
			commit(open);
			return;
		}
		const el = menu();
		if (el) el.hidden = !open;
	}

	private set(phase: Phase): void {
		this.phase = phase;
		this.options.onPhase?.(phase);
	}

	private onPointerDown = (e: PointerEvent): void => {
		if (e.button !== 0 || this.phase === "opening" || this.phase === "open") {
			return;
		}
		if (!this.press.down(e.pointerId, e.clientX, e.clientY)) return;
		this.squeeze.set(PRESSED_SCALE);
		this.listen();
	};

	private onPointerMove = (e: PointerEvent): void => {
		this.press.move(e.pointerId, e.clientX, e.clientY);
	};

	private onPointerEnd = (e: PointerEvent): void => {
		this.press.up(e.pointerId);
	};

	private onOverlayDown = (e: PointerEvent): void => {
		e.preventDefault();
		this.close();
	};

	private listen(): void {
		addEventListener("pointermove", this.onPointerMove);
		addEventListener("pointerup", this.onPointerEnd);
		addEventListener("pointercancel", this.onPointerEnd);
	}

	private unlisten(): void {
		removeEventListener("pointermove", this.onPointerMove);
		removeEventListener("pointerup", this.onPointerEnd);
		removeEventListener("pointercancel", this.onPointerEnd);
	}
}
