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
	/** A menu item was picked, by drag, tap or keyboard. */
	onSelect?: (item: HTMLElement) => void;
	onPhase?: (phase: Phase) => void;
}

const ITEM = '[data-emerse-item]:not([disabled],[aria-disabled="true"])';

const SQUEEZE = { duration: 0.45, bounce: 0, rest: 0.001 };
const LIFT = { duration: 0.45, bounce: 0.35, rest: 0.001 };
const REVEAL = { duration: 0.42, bounce: 0.3, rest: 0.002 };

/** How long after release a click still counts as part of the press. */
const STRAY_CLICK_MS = 350;

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
	private pointerId = 0;
	private dragging = false;
	private hot: HTMLElement | null = null;
	private strayTimer = 0;
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
				this.show();
				if (this.phase === "closed") this.unlisten();
				else this.dragging = true;
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
		// Has to exist before the touch starts or iOS won't let it stop a pan.
		el.addEventListener("touchmove", this.onTouchMove, { passive: false });
	}

	/** Puts everything back, even if the menu is up. */
	destroy(): void {
		this.teardown();
		this.detach();
	}

	close(): void {
		const { stage } = this;
		if (!stage || this.phase === "closing") return;
		this.endDrag();
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
		menu.addEventListener("click", this.onMenuClick);

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
		stage.menu.removeEventListener("click", this.onMenuClick);
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
		this.endDrag();
		this.squeeze.jump(1);
		const { stage } = this;
		if (!stage) return;
		clearTimeout(this.fadeTimer);
		stage.lift.stop();
		stage.reveal.stop();
		this.finish();
	}

	private endDrag(): void {
		if (!this.dragging) return;
		this.dragging = false;
		this.unlisten();
		this.highlight(null);
	}

	private highlight(item: HTMLElement | null): void {
		if (item === this.hot) return;
		this.hot?.removeAttribute("data-highlighted");
		item?.setAttribute("data-highlighted", "");
		this.hot = item;
	}

	private itemAt(x: number, y: number): HTMLElement | null {
		const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(ITEM);
		return hit && this.stage?.menu.contains(hit) ? hit : null;
	}

	private pick(item: HTMLElement): void {
		if (this.phase !== "opening" && this.phase !== "open") return;
		this.options.onSelect?.(item);
		this.close();
	}

	private detach(): void {
		this.el?.removeEventListener("pointerdown", this.onPointerDown);
		this.el?.removeEventListener("touchmove", this.onTouchMove);
		this.el = null;
		this.disarmStrayClick();
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
		this.pointerId = e.pointerId;
		this.squeeze.set(PRESSED_SCALE);
		this.listen();
	};

	private onPointerMove = (e: PointerEvent): void => {
		this.press.move(e.pointerId, e.clientX, e.clientY);
		if (this.dragging && e.pointerId === this.pointerId) {
			this.highlight(this.itemAt(e.clientX, e.clientY));
		}
	};

	private onPointerEnd = (e: PointerEvent): void => {
		if (this.press.active) {
			this.press.up(e.pointerId);
			return;
		}
		if (!this.dragging || e.pointerId !== this.pointerId) return;
		const item = this.hot;
		this.endDrag();
		if (e.type !== "pointerup") return;
		this.armStrayClick();
		if (item) this.pick(item);
	};

	private onOverlayDown = (e: PointerEvent): void => {
		e.preventDefault();
		// The overlay stops catching pointers once it starts closing, so the tap
		// that dismissed it could otherwise land on the page underneath.
		this.armStrayClick(true);
		this.close();
	};

	/** A pan that starts once the menu is up would end the drag with a cancel. */
	private onTouchMove = (e: TouchEvent): void => {
		if (this.dragging && e.cancelable) e.preventDefault();
	};

	/** Scrolling under a resting finger never moves the pointer. */
	private onScroll = (e: Event): void => {
		if (this.el && (e.target as Node).contains(this.el)) this.press.cancel();
	};

	/**
	 * The click that follows a long press isn't a tap on whatever is under it.
	 * Touch often sends none at all, so this can't wait around for one: the next
	 * press, or a short while after release, gives up on it. Pass `held` when the
	 * finger is still down, so the wait only starts once it lifts.
	 */
	private armStrayClick(held = false): void {
		if (!held) this.restartStrayTimer();
		addEventListener("click", this.onStrayClick, true);
		addEventListener("pointerup", this.restartStrayTimer, true);
		addEventListener("pointerdown", this.disarmStrayClick, true);
	}

	private restartStrayTimer = (): void => {
		clearTimeout(this.strayTimer);
		this.strayTimer = setTimeout(
			this.disarmStrayClick,
			STRAY_CLICK_MS,
		) as unknown as number;
	};

	private disarmStrayClick = (): void => {
		clearTimeout(this.strayTimer);
		removeEventListener("click", this.onStrayClick, true);
		removeEventListener("pointerup", this.restartStrayTimer, true);
		removeEventListener("pointerdown", this.disarmStrayClick, true);
	};

	private onStrayClick = (e: MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
		this.disarmStrayClick();
	};

	private onMenuClick = (e: MouseEvent): void => {
		const item = (e.target as Element).closest<HTMLElement>(ITEM);
		if (item) this.pick(item);
	};

	private listen(): void {
		addEventListener("pointermove", this.onPointerMove);
		addEventListener("pointerup", this.onPointerEnd);
		addEventListener("pointercancel", this.onPointerEnd);
		addEventListener("scroll", this.onScroll, true);
	}

	private unlisten(): void {
		removeEventListener("pointermove", this.onPointerMove);
		removeEventListener("pointerup", this.onPointerEnd);
		removeEventListener("pointercancel", this.onPointerEnd);
		removeEventListener("scroll", this.onScroll, true);
	}
}
