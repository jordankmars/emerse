// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure } from "./config";
import { Peek, type PeekOptions } from "./peek";

let peek: Peek;

function setup(options: Partial<PeekOptions> = {}) {
	const trigger = document.createElement("button");
	trigger.textContent = "Message";
	const menu = document.createElement("div");
	menu.hidden = true;
	menu.innerHTML =
		'<button data-emerse-item="a">A</button><button data-emerse-item="b">B</button><button data-emerse-item="c">C</button>';
	document.body.append(trigger, menu);
	const items = [...menu.querySelectorAll("button")];
	peek = new Peek({
		trigger: () => trigger,
		menu: () => menu,
		...options,
	});
	peek.attach();
	return { trigger, menu, items };
}

function pointer(
	type: string,
	target: EventTarget,
	init: PointerEventInit = {},
) {
	const e = new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		pointerId: 1,
		button: 0,
		...init,
	});
	target.dispatchEvent(e);
	return e;
}

function hold(trigger: Element) {
	pointer("pointerdown", trigger);
	vi.advanceTimersByTime(450);
}

const overlay = () =>
	document.querySelector<HTMLElement>("[data-emerse-overlay]");
const lifted = () =>
	document.querySelector<HTMLElement>("[data-emerse-lifted]");

beforeEach(() => {
	vi.useFakeTimers();
	configure({ reduced: true });
});

afterEach(() => {
	peek.destroy();
	document.body.replaceChildren();
	vi.useRealTimers();
	configure({ reduced: null });
});

describe("opening", () => {
	it("does nothing until the press has been held long enough", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger);
		vi.advanceTimersByTime(449);
		expect(peek.phase).toBe("closed");
		vi.advanceTimersByTime(1);
		expect(peek.phase).toBe("open");
	});

	it("ignores buttons other than the main one", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { button: 2 });
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
	});

	it("cancels if the pointer wanders", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { clientX: 0 });
		pointer("pointermove", trigger, { clientX: 9 });
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
	});

	it("cancels on early release", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger);
		pointer("pointerup", trigger);
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
	});

	it("lifts a copy and hides the trigger", () => {
		const { trigger, menu } = setup();
		hold(trigger);
		expect(overlay()).not.toBeNull();
		expect(lifted()?.textContent).toBe("Message");
		expect(lifted()?.getAttribute("aria-hidden")).toBe("true");
		expect(lifted()?.style.transform).toBe("scale(1.04)");
		expect(trigger.style.visibility).toBe("hidden");
		expect(menu.hidden).toBe(false);
		expect(menu.style.position).toBe("fixed");
	});

	it("doesn't carry ids onto the copy", () => {
		const { trigger } = setup();
		trigger.id = "message";
		trigger.innerHTML = '<span id="inner">Hi</span>';
		hold(trigger);
		expect(lifted()?.id).toBe("");
		expect(lifted()?.querySelector("#inner")).toBeNull();
	});

	it("mounts through commit before reading the menu", () => {
		const menu = document.createElement("div");
		let mounted: HTMLElement | null = null;
		const { trigger } = setup({
			menu: () => mounted,
			commit: (open) => {
				mounted = open ? menu : null;
			},
		});
		hold(trigger);
		expect(peek.phase).toBe("open");
		expect(menu.style.position).toBe("fixed");
	});
});

describe("closing", () => {
	it("closes when the overlay is pressed and puts everything back", () => {
		const phases: string[] = [];
		const { trigger, menu } = setup({ onPhase: (p) => phases.push(p) });
		hold(trigger);
		pointer("pointerdown", overlay() as HTMLElement);
		expect(peek.phase).toBe("closing");
		vi.advanceTimersByTime(1);
		expect(phases).toEqual(["opening", "open", "closing", "closed"]);
		expect(overlay()).toBeNull();
		expect(lifted()).toBeNull();
		expect(trigger.style.visibility).toBe("");
		expect(menu.hidden).toBe(true);
		expect(menu.style.position).toBe("");
	});

	it("can open again afterwards", () => {
		const { trigger } = setup();
		hold(trigger);
		peek.close();
		vi.advanceTimersByTime(1);
		hold(trigger);
		expect(peek.phase).toBe("open");
		expect(document.querySelectorAll("[data-emerse-overlay]")).toHaveLength(1);
	});

	it("restores everything when destroyed while open", () => {
		const { trigger, menu } = setup();
		hold(trigger);
		peek.destroy();
		expect(peek.phase).toBe("closed");
		expect(overlay()).toBeNull();
		expect(trigger.style.visibility).toBe("");
		expect(menu.hidden).toBe(true);
	});
});

describe("drag to select", () => {
	function dragOver(item: Element | null) {
		document.elementFromPoint = () => item;
		pointer("pointermove", window, { clientX: 40, clientY: 40 });
	}

	it("highlights the item under the finger", () => {
		const { trigger, items } = setup();
		hold(trigger);
		dragOver(items[1]);
		expect(items[1].hasAttribute("data-highlighted")).toBe(true);
		dragOver(items[2]);
		expect(items[1].hasAttribute("data-highlighted")).toBe(false);
		expect(items[2].hasAttribute("data-highlighted")).toBe(true);
	});

	it("picks the item it's released on, in one motion", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		hold(trigger);
		dragOver(items[1]);
		pointer("pointerup", window);
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(items[1]);
		expect(peek.phase).toBe("closing");
	});

	it("stays open when released away from any item", () => {
		const onSelect = vi.fn();
		const { trigger } = setup({ onSelect });
		hold(trigger);
		dragOver(document.body);
		pointer("pointerup", window);
		expect(onSelect).not.toHaveBeenCalled();
		expect(peek.phase).toBe("open");
	});

	it("picks nothing when the gesture is cancelled", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		hold(trigger);
		dragOver(items[0]);
		pointer("pointercancel", window);
		expect(onSelect).not.toHaveBeenCalled();
		expect(items[0].hasAttribute("data-highlighted")).toBe(false);
	});

	it("follows only the finger that started", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		hold(trigger);
		dragOver(items[0]);
		pointer("pointerup", window, { pointerId: 2 });
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("can be tapped through after the finger lifts", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		hold(trigger);
		pointer("pointerup", window);
		pointer("pointerdown", items[2]);
		pointer("pointerup", items[2]);
		items[2].click();
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(items[2]);
	});

	it("ignores disabled items", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		items[0].disabled = true;
		hold(trigger);
		dragOver(items[0]);
		expect(items[0].hasAttribute("data-highlighted")).toBe(false);
	});
});

describe("telling a long press from other gestures", () => {
	function touchMove(target: Element) {
		const e = new Event("touchmove", { cancelable: true });
		target.dispatchEvent(e);
		return e;
	}

	it("cancels when the browser takes over for a pan", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger);
		pointer("pointercancel", trigger);
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
	});

	it("cancels when something around the trigger scrolls", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger);
		document.dispatchEvent(new Event("scroll"));
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
	});

	it("keeps going when something unrelated scrolls", () => {
		const { trigger } = setup();
		const other = document.createElement("div");
		document.body.append(other);
		pointer("pointerdown", trigger);
		other.dispatchEvent(new Event("scroll"));
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("open");
	});

	it("only blocks touch panning during a drag", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger);
		expect(touchMove(trigger).defaultPrevented).toBe(false);
		vi.advanceTimersByTime(450);
		expect(touchMove(trigger).defaultPrevented).toBe(true);
		pointer("pointerup", window);
		expect(touchMove(trigger).defaultPrevented).toBe(false);
	});

	it("lets a tap through as a normal click", () => {
		const { trigger } = setup();
		const onClick = vi.fn();
		trigger.addEventListener("click", onClick);
		pointer("pointerdown", trigger);
		pointer("pointerup", trigger);
		trigger.click();
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("swallows the click after a long press", () => {
		const { trigger } = setup();
		const onClick = vi.fn();
		document.body.addEventListener("click", onClick);
		hold(trigger);
		pointer("pointerup", window);
		document.body.click();
		document.body.removeEventListener("click", onClick);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("gives up waiting for that click", () => {
		const { trigger } = setup();
		const onClick = vi.fn();
		document.body.addEventListener("click", onClick);
		hold(trigger);
		pointer("pointerup", window);
		vi.advanceTimersByTime(350);
		document.body.click();
		document.body.removeEventListener("click", onClick);
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("doesn't eat the next real tap", () => {
		const { trigger, items } = setup();
		const onSelect = vi.fn();
		peek.destroy();
		peek = new Peek({
			trigger: () => trigger,
			menu: () => items[0].parentElement,
			onSelect,
		});
		peek.attach();
		hold(trigger);
		pointer("pointerup", window);
		pointer("pointerdown", items[1]);
		pointer("pointerup", items[1]);
		items[1].click();
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(items[1]);
	});

	it("doesn't let a dismissing tap fall through to the page", () => {
		const { trigger } = setup();
		const onClick = vi.fn();
		document.body.addEventListener("click", onClick);
		hold(trigger);
		pointer("pointerup", window);
		pointer("pointerdown", overlay() as HTMLElement);
		vi.advanceTimersByTime(600);
		pointer("pointerup", window);
		document.body.click();
		document.body.removeEventListener("click", onClick);
		expect(onClick).not.toHaveBeenCalled();
	});
});

describe("text selection", () => {
	const selectStart = () => {
		const e = new Event("selectstart", { bubbles: true, cancelable: true });
		document.body.dispatchEvent(e);
		return e;
	};

	it("turns selection off during a touch press and back on after", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { pointerType: "touch" });
		expect(trigger.style.getPropertyValue("-webkit-user-select")).toBe("none");
		expect(selectStart().defaultPrevented).toBe(true);
		pointer("pointerup", trigger);
		expect(trigger.style.getPropertyValue("-webkit-user-select")).toBe("");
	});

	it("leaves a mouse free to select text", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { pointerType: "mouse" });
		expect(trigger.style.getPropertyValue("user-select")).toBe("");
		expect(selectStart().defaultPrevented).toBe(false);
	});

	it("blocks selection once a drag has started", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { pointerType: "mouse" });
		vi.advanceTimersByTime(450);
		expect(selectStart().defaultPrevented).toBe(true);
	});

	it("doesn't open over text the mouse has started selecting", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { pointerType: "mouse" });
		getSelection()?.selectAllChildren(trigger);
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
		getSelection()?.removeAllRanges();
	});

	it("stops a native drag from cancelling the press", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger);
		const e = new Event("dragstart", { bubbles: true, cancelable: true });
		trigger.dispatchEvent(e);
		expect(e.defaultPrevented).toBe(true);
	});
});

describe("context menu", () => {
	const contextMenu = (target: EventTarget) => {
		const e = new MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
		});
		target.dispatchEvent(e);
		return e;
	};
	const touchMove = (target: Element) => {
		const e = new Event("touchmove", { cancelable: true });
		target.dispatchEvent(e);
		return e;
	};

	it("suppresses the callout on the trigger", () => {
		// jsdom drops this property, so check that it was asked for.
		const set = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
		setup();
		expect(set).toHaveBeenCalledWith("-webkit-touch-callout", "none");
		set.mockRestore();
	});

	it("opens on right click without starting a drag", () => {
		const { trigger } = setup();
		expect(contextMenu(trigger).defaultPrevented).toBe(true);
		expect(peek.phase).toBe("open");
		expect(touchMove(trigger).defaultPrevented).toBe(false);
	});

	it("leaves ctrl+click to the context menu", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { ctrlKey: true });
		vi.advanceTimersByTime(450);
		expect(peek.phase).toBe("closed");
	});

	it("treats Android's early long press as the press firing", () => {
		const { trigger } = setup();
		pointer("pointerdown", trigger, { pointerType: "touch" });
		vi.advanceTimersByTime(400);
		contextMenu(trigger);
		expect(peek.phase).toBe("open");
		expect(touchMove(trigger).defaultPrevented).toBe(true);
	});

	it("keeps the drag alive when Android's arrives after ours", () => {
		const { trigger, items } = setup();
		pointer("pointerdown", trigger, { pointerType: "touch" });
		vi.advanceTimersByTime(450);
		expect(contextMenu(trigger).defaultPrevented).toBe(true);
		document.elementFromPoint = () => items[0];
		pointer("pointermove", window);
		expect(items[0].hasAttribute("data-highlighted")).toBe(true);
	});

	it("blocks the browser's menu on the overlay and our menu", () => {
		const { trigger, menu } = setup();
		hold(trigger);
		expect(contextMenu(overlay() as HTMLElement).defaultPrevented).toBe(true);
		expect(contextMenu(menu).defaultPrevented).toBe(true);
	});
});

describe("keyboard", () => {
	const key = (
		target: EventTarget,
		name: string,
		init: KeyboardEventInit = {},
	) => {
		const e = new KeyboardEvent("keydown", {
			key: name,
			bubbles: true,
			cancelable: true,
			...init,
		});
		target.dispatchEvent(e);
		return e;
	};

	for (const name of ["Enter", " ", "ContextMenu"]) {
		it(`opens on ${JSON.stringify(name)} and focuses the first item`, () => {
			const { trigger, items } = setup();
			trigger.focus();
			expect(key(trigger, name).defaultPrevented).toBe(true);
			expect(peek.phase).toBe("open");
			expect(document.activeElement).toBe(items[0]);
		});
	}

	it("opens on Shift+F10", () => {
		const { trigger } = setup();
		key(trigger, "F10", { shiftKey: true });
		expect(peek.phase).toBe("open");
	});

	it("ignores keys from inside the trigger", () => {
		const { trigger } = setup();
		const link = trigger.appendChild(document.createElement("a"));
		key(link, "Enter");
		expect(peek.phase).toBe("closed");
	});

	it("wraps with the arrow keys", () => {
		const { trigger, items } = setup();
		key(trigger, "Enter");
		key(items[0], "ArrowUp");
		expect(document.activeElement).toBe(items[2]);
		key(items[2], "ArrowDown");
		expect(document.activeElement).toBe(items[0]);
		key(items[0], "ArrowDown");
		expect(document.activeElement).toBe(items[1]);
	});

	it("jumps with Home and End", () => {
		const { trigger, items } = setup();
		key(trigger, "Enter");
		key(items[0], "End");
		expect(document.activeElement).toBe(items[2]);
		key(items[2], "Home");
		expect(document.activeElement).toBe(items[0]);
	});

	it("focuses the menu itself after a pointer open, so keys work", () => {
		const { trigger, menu, items } = setup();
		hold(trigger);
		expect(document.activeElement).toBe(menu);
		key(menu, "ArrowUp");
		expect(document.activeElement).toBe(items[2]);
	});

	it("swallows Tab", () => {
		const { trigger, items } = setup();
		key(trigger, "Enter");
		expect(key(items[0], "Tab").defaultPrevented).toBe(true);
	});

	it("picks the focused item", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		key(trigger, "Enter");
		key(items[0], "Enter");
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(items[0]);
	});

	it("doesn't pick on a held key", () => {
		const onSelect = vi.fn();
		const { trigger, items } = setup({ onSelect });
		key(trigger, "Enter");
		key(items[0], "Enter", { repeat: true });
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("closes on Escape and gives focus back", () => {
		const { trigger, items } = setup();
		trigger.focus();
		key(trigger, "Enter");
		key(items[0], "Escape");
		expect(peek.phase).toBe("closing");
		expect(document.activeElement).toBe(trigger);
	});

	it("gives focus back after a pick", () => {
		const { trigger, items } = setup();
		key(trigger, "Enter");
		key(items[1], "Enter");
		expect(document.activeElement).toBe(trigger);
	});

	it("leaves focus alone if something else took it", () => {
		const other = document.body.appendChild(document.createElement("input"));
		const { trigger, items } = setup({ onSelect: () => other.focus() });
		key(trigger, "Enter");
		key(items[1], "Enter");
		expect(document.activeElement).toBe(other);
	});

	it("keeps the trigger invisible while it can take focus", () => {
		const { trigger, items } = setup();
		key(trigger, "Enter");
		key(items[0], "Escape");
		expect(trigger.style.visibility).toBe("");
		expect(trigger.style.opacity).toBe("0");
		vi.advanceTimersByTime(1);
		expect(trigger.style.opacity).toBe("");
	});

	it("takes focus back after a mouse dismiss", () => {
		const { trigger } = setup();
		hold(trigger);
		pointer("pointerup", window);
		pointer("pointerdown", overlay() as HTMLElement);
		(document.activeElement as HTMLElement | null)?.blur();
		vi.advanceTimersByTime(0);
		expect(document.activeElement).toBe(trigger);
	});
});

describe("scroll lock", () => {
	const html = document.documentElement;

	it("locks the page while open and lets go as it closes", () => {
		const { trigger } = setup();
		hold(trigger);
		expect(html.style.overflow).toBe("hidden");
		peek.close();
		expect(html.style.overflow).toBe("");
	});

	it("lets go when destroyed", () => {
		const { trigger } = setup();
		hold(trigger);
		peek.destroy();
		expect(html.style.overflow).toBe("");
	});
});

describe("inert", () => {
	function bystander() {
		return document.body.appendChild(document.createElement("div"));
	}

	it("makes the page inert after a right click", () => {
		const { trigger, menu } = setup();
		const other = bystander();
		trigger.dispatchEvent(new MouseEvent("contextmenu", { cancelable: true }));
		expect(other.hasAttribute("inert")).toBe(true);
		expect(menu.hasAttribute("inert")).toBe(false);
		expect(overlay()?.hasAttribute("inert")).toBe(false);
	});

	it("waits for a drag to finish", () => {
		const { trigger } = setup();
		const other = bystander();
		hold(trigger);
		expect(other.hasAttribute("inert")).toBe(false);
		pointer("pointerup", window);
		expect(other.hasAttribute("inert")).toBe(true);
	});

	it("releases before focus goes back", () => {
		const { trigger, items } = setup();
		const other = bystander();
		trigger.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", cancelable: true }),
		);
		items[0].dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(other.hasAttribute("inert")).toBe(false);
		expect(trigger.hasAttribute("inert")).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});

	it("is gone once a drag has picked an item", () => {
		const { trigger, items } = setup();
		const other = bystander();
		hold(trigger);
		document.elementFromPoint = () => items[0];
		pointer("pointermove", window);
		pointer("pointerup", window);
		expect(other.hasAttribute("inert")).toBe(false);
	});
});
