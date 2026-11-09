import { cloneTrigger } from "./clone";
import { config, isReduced } from "./config";
import { inertOthers } from "./inert";
import { lockScroll } from "./lock";
import { Motion } from "./motion";
import { placeMenu, type View } from "./placement";
import { Press } from "./press";
import { isVirtualClick, isVirtualPointerDown } from "./virtual";

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
	/** Where the overlay and the lifted copy go. Defaults to the body. */
	container?: () => Element | null;
	/** Builds the lifted copy, for triggers a plain clone can't reproduce. */
	clone?: (trigger: HTMLElement) => HTMLElement;
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

/** Only one menu is ever up, so a new one sends the last one straight home. */
let current: Peek | null = null;

/** The part of the page you can see, which excludes the iOS keyboard. */
function visibleArea(): View {
	const v = window.visualViewport;
	return v
		? { x: v.offsetLeft, y: v.offsetTop, w: v.width, h: v.height }
		: { x: 0, y: 0, w: innerWidth, h: innerHeight };
}

/** Runs `then` once it has been called `count` times. */
function latch(count: number, then: () => void): () => void {
	let left = count;
	return () => {
		if (--left === 0) then();
	};
}

function blockContextMenu(e: Event): void {
	e.preventDefault();
}

export class Peek {
	phase: Phase = "closed";
	private options: PeekOptions;
	private el: HTMLElement | null = null;
	private stage: Stage | null = null;
	private fadeTimer = 0;
	private pointerId = 0;
	private pointerType = "";
	private selection: { standard: string; webkit: string } | null = null;
	private dragging = false;
	private hot: HTMLElement | null = null;
	private strayTimer = 0;
	private addedTabIndex = false;
	private unlock: (() => void) | null = null;
	private uninert: (() => void) | null = null;
	private visibility = "";
	private opacity = "";
	private press: Press;
	private squeeze: Motion;

	constructor(options: PeekOptions) {
		this.options = options;
		this.squeeze = new Motion(1, SQUEEZE, (s) => {
			if (this.el) this.el.style.transform = s === 1 ? "" : `scale(${s})`;
		});
		this.press = new Press({
			onFire: () => {
				if (this.isSelectingText()) {
					this.unlisten();
					this.squeeze.set(1);
					return;
				}
				this.show(false, true);
				if (this.phase === "closed") this.unlisten();
			},
			onCancel: () => {
				this.unlisten();
				this.squeeze.set(1);
			},
		});
	}

	/** Swaps in new callbacks without touching what's on screen. */
	update(next: Partial<PeekOptions>): void {
		this.options = { ...this.options, ...next };
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
		el.addEventListener("contextmenu", this.onContextMenu);
		el.addEventListener("keydown", this.onTriggerKeyDown);
		el.addEventListener("click", this.onTriggerClick, true);
		el.setAttribute("aria-haspopup", "menu");
		el.setAttribute("aria-expanded", "false");
		this.addedTabIndex = el.tabIndex < 0;
		if (this.addedTabIndex) el.tabIndex = 0;
		el.style.setProperty("-webkit-touch-callout", "none");
	}

	/** Puts everything back, even if the menu is up. */
	destroy(): void {
		this.teardown();
		this.detach();
	}

	/** Opens with focus on the first item, the way a keyboard does. */
	open(): void {
		this.press.cancel();
		this.show(true);
	}

	close(): void {
		const { stage } = this;
		if (!stage || this.phase === "closing") return;
		this.set("closing");
		this.endDrag();
		this.forget();
		this.unwatch();
		this.el?.setAttribute("aria-expanded", "false");
		this.releaseInert();
		this.uncloak();
		this.returnFocus();
		this.releaseScroll();
		stage.overlay.style.pointerEvents = "none";
		stage.menu.style.pointerEvents = "none";
		const done = latch(3, () => this.finish());
		stage.reveal.onRest = done;
		stage.reveal.set(0);
		stage.lift.onRest = done;
		stage.lift.set(1);
		this.fade(stage, false, done);
	}

	private show(focusFirst = false, dragging = false): void {
		if (this.phase === "opening" || this.phase === "open") return;
		const from = this.squeeze.x;
		this.squeeze.jump(1);
		const stage = this.stage ?? this.mount(from);
		if (!stage) return;
		if (current !== this) current?.teardown();
		current = this;
		stage.overlay.style.pointerEvents = "";
		stage.menu.style.pointerEvents = "";
		this.set("opening");
		this.dragging = dragging;
		const done = latch(2, () => this.set("open"));
		stage.lift.onRest = done;
		stage.lift.set(LIFTED_SCALE);
		stage.reveal.onRest = done;
		stage.reveal.set(1);
		this.fade(stage, true);
		if (this.el) {
			this.cloak(this.el);
			this.el.setAttribute("aria-expanded", "true");
		}
		stage.menu.setAttribute("role", "menu");
		for (const item of stage.menu.querySelectorAll("[data-emerse-item]")) {
			item.setAttribute("role", "menuitem");
			item.setAttribute("tabindex", "-1");
		}
		this.unlock ??= lockScroll(() => stage.menu);
		this.applyInert();
		this.watch();
		const first = focusFirst ? this.items(stage.menu)[0] : null;
		(first ?? stage.menu).focus({ preventScroll: true });
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
		overlay.addEventListener("contextmenu", blockContextMenu);
		menu.addEventListener("click", this.onMenuClick);
		menu.addEventListener("contextmenu", blockContextMenu);

		const clone = (this.options.clone ?? cloneTrigger)(trigger);
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
		(this.options.container?.() ?? document.body).append(overlay, clone);
		menu.style.position = "fixed";
		// Lets the menu take focus on its own, so its keys work after a pointer open.
		menu.tabIndex = -1;
		menu.style.outline = "none";
		this.place(stage, trigger);
		clone.style.transform = `scale(${from})`;
		applyReveal(0);

		this.visibility = trigger.style.visibility;
		this.opacity = trigger.style.opacity;
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
		const { left, top, below } = placeMenu(rect, size, visibleArea(), edge);
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
		stage.menu.removeEventListener("contextmenu", blockContextMenu);
		this.releaseScroll();
		this.releaseInert();
		const { style } = stage.menu;
		for (const prop of [
			"position",
			"left",
			"top",
			"opacity",
			"transform",
			"transform-origin",
			"pointer-events",
			"outline",
		]) {
			style.removeProperty(prop);
		}
		stage.menu.removeAttribute("tabindex");
		this.forget();
		this.unwatch();
		if (this.el) {
			this.el.style.visibility = this.visibility;
			this.el.style.opacity = this.opacity;
			this.el.setAttribute("aria-expanded", "false");
		}
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

	/** Waits for a drag to end, so the finger's touch stream is left alone. */
	private applyInert(): void {
		const { stage } = this;
		if (!stage || this.uninert || this.dragging) return;
		if (this.phase !== "opening" && this.phase !== "open") return;
		this.uninert = inertOthers([stage.menu, stage.overlay, stage.clone]);
	}

	private releaseInert(): void {
		this.uninert?.();
		this.uninert = null;
	}

	private forget(): void {
		if (current === this) current = null;
	}

	private watch(): void {
		// Capture, so the key press that opened the menu doesn't also reach it.
		document.addEventListener("keydown", this.onKeyDown, true);
		addEventListener("resize", this.onResize);
		window.visualViewport?.addEventListener("resize", this.onResize);
	}

	private unwatch(): void {
		document.removeEventListener("keydown", this.onKeyDown, true);
		removeEventListener("resize", this.onResize);
		window.visualViewport?.removeEventListener("resize", this.onResize);
	}

	private releaseScroll(): void {
		this.unlock?.();
		this.unlock = null;
	}

	/** Hides the trigger behind its copy. */
	private cloak(trigger: HTMLElement): void {
		trigger.style.visibility = "hidden";
		trigger.style.opacity = this.opacity;
	}

	/** Still invisible, but a visibility: hidden element can't take focus back. */
	private uncloak(): void {
		if (!this.el) return;
		this.el.style.visibility = this.visibility;
		this.el.style.opacity = "0";
	}

	/** Only takes focus back if nothing else has claimed it in the meantime. */
	private returnFocus = (): void => {
		const active = document.activeElement;
		const unclaimed =
			!active || active === document.body || this.stage?.menu.contains(active);
		if (unclaimed) this.el?.focus({ preventScroll: true });
	};

	private items(menu: HTMLElement): HTMLElement[] {
		return [...menu.querySelectorAll<HTMLElement>(ITEM)];
	}

	private endDrag(): void {
		if (!this.dragging) return;
		this.dragging = false;
		this.unlisten();
		this.highlight(null);
		this.applyInert();
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
		this.el?.removeEventListener("contextmenu", this.onContextMenu);
		this.el?.removeEventListener("keydown", this.onTriggerKeyDown);
		this.el?.removeEventListener("click", this.onTriggerClick, true);
		this.el?.removeAttribute("aria-haspopup");
		this.el?.removeAttribute("aria-expanded");
		if (this.addedTabIndex) this.el?.removeAttribute("tabindex");
		this.el?.style.removeProperty("-webkit-touch-callout");
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
		// Ctrl+click is a right click on a Mac, and contextmenu handles those.
		if (e.button !== 0 || e.ctrlKey || isVirtualPointerDown(e)) return;
		if (this.phase === "opening" || this.phase === "open") return;
		if (!this.press.down(e.pointerId, e.clientX, e.clientY)) return;
		this.pointerId = e.pointerId;
		this.pointerType = e.pointerType;
		if (e.pointerType !== "mouse") this.holdSelection();
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
		// A mouse press still moves focus to the overlay after this returns.
		setTimeout(this.returnFocus);
	};

	/** Holding still isn't an option with a screen reader, so its tap opens it. */
	private onTriggerClick = (e: MouseEvent): void => {
		if (!isVirtualClick(e)) return;
		e.preventDefault();
		e.stopPropagation();
		this.show(true);
	};

	private onResize = (): void => {
		if (this.stage && this.el) this.place(this.stage, this.el);
	};

	private onTriggerKeyDown = (e: KeyboardEvent): void => {
		// Keys pressed inside a link or field in the trigger stay theirs.
		if (e.target !== this.el || e.repeat) return;
		const opens =
			e.key === "Enter" ||
			e.key === " " ||
			e.key === "ContextMenu" ||
			(e.key === "F10" && e.shiftKey);
		if (!opens) return;
		e.preventDefault();
		this.press.cancel();
		this.show(true);
	};

	private onKeyDown = (e: KeyboardEvent): void => {
		const menu = this.stage?.menu;
		if (!menu) return;
		const items = this.items(menu);
		const count = items.length;
		const at = items.indexOf(document.activeElement as HTMLElement);
		const focus = (i: number) => items[i]?.focus({ preventScroll: true });

		switch (e.key) {
			case "Escape":
				e.preventDefault();
				this.close();
				break;
			case "Tab":
				e.preventDefault();
				break;
			case "ArrowDown":
				e.preventDefault();
				focus((at + 1) % count);
				break;
			case "ArrowUp":
				e.preventDefault();
				focus(at < 0 ? count - 1 : (at - 1 + count) % count);
				break;
			case "Home":
				e.preventDefault();
				focus(0);
				break;
			case "End":
				e.preventDefault();
				focus(count - 1);
				break;
			case "Enter":
			case " ":
				e.preventDefault();
				// A held key from opening the menu mustn't also pick from it.
				if (!e.repeat && at >= 0) this.pick(items[at]);
				break;
		}
	};

	/** A pan that starts once the menu is up would end the drag with a cancel. */
	private onTouchMove = (e: TouchEvent): void => {
		if (this.dragging && e.cancelable) e.preventDefault();
	};

	private onContextMenu = (e: Event): void => {
		e.preventDefault();
		// Android sends this for a long press too, sometimes just after ours fired.
		if (this.phase === "opening" || this.phase === "open") return;
		if (this.press.active && this.pointerType !== "mouse") {
			this.press.fire();
			return;
		}
		this.press.cancel();
		this.show();
	};

	private onSelectStart = (e: Event): void => {
		// A mouse that wanders past the tolerance is selecting text on purpose.
		if (this.dragging || this.pointerType !== "mouse") e.preventDefault();
	};

	private onDragStart = (e: Event): void => {
		e.preventDefault();
	};

	/** Stops a held finger turning into the browser's own text selection. */
	private holdSelection(): void {
		const { el } = this;
		if (!el || this.selection) return;
		const { style } = el;
		this.selection = {
			standard: style.getPropertyValue("user-select"),
			webkit: style.getPropertyValue("-webkit-user-select"),
		};
		style.setProperty("user-select", "none");
		style.setProperty("-webkit-user-select", "none");
	}

	private releaseSelection(): void {
		if (!this.selection) return;
		this.el?.style.setProperty("user-select", this.selection.standard);
		this.el?.style.setProperty("-webkit-user-select", this.selection.webkit);
		this.selection = null;
	}

	private isSelectingText(): boolean {
		if (this.pointerType !== "mouse") return false;
		const selection = getSelection();
		return (
			!!selection &&
			!selection.isCollapsed &&
			!!this.el?.contains(selection.anchorNode)
		);
	}

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
		document.addEventListener("selectstart", this.onSelectStart);
		document.addEventListener("dragstart", this.onDragStart);
	}

	private unlisten(): void {
		removeEventListener("pointermove", this.onPointerMove);
		removeEventListener("pointerup", this.onPointerEnd);
		removeEventListener("pointercancel", this.onPointerEnd);
		removeEventListener("scroll", this.onScroll, true);
		document.removeEventListener("selectstart", this.onSelectStart);
		document.removeEventListener("dragstart", this.onDragStart);
		this.releaseSelection();
	}
}
