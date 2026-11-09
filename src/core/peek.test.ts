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
