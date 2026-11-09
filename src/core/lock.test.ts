// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { lockScroll, scrollParent } from "./lock";

const html = document.documentElement;

function touch(type: string, target: Element, y: number, fingers = 1) {
	const e = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperty(e, "touches", {
		value: Array(fingers).fill({ clientY: y }),
	});
	target.dispatchEvent(e);
	return e;
}

function scroller(top: number, parent: Element = document.body) {
	const el = document.createElement("div");
	el.style.overflowY = "auto";
	Object.defineProperty(el, "scrollHeight", { value: 500 });
	Object.defineProperty(el, "clientHeight", { value: 100 });
	el.scrollTop = top;
	const child = document.createElement("p");
	el.append(child);
	parent.append(el);
	return { el, child };
}

function pan(target: Element, from: number, to: number) {
	touch("touchstart", target, from);
	return touch("touchmove", target, to);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("lockScroll", () => {
	it("locks the root and puts its styles back", () => {
		html.style.overflow = "scroll";
		const release = lockScroll(() => null);
		expect(html.style.overflow).toBe("hidden");
		release();
		expect(html.style.overflow).toBe("scroll");
		html.style.overflow = "";
	});

	it("stays locked until the last one releases", () => {
		const first = lockScroll(() => null);
		const second = lockScroll(() => null);
		first();
		first();
		expect(html.style.overflow).toBe("hidden");
		second();
		expect(html.style.overflow).toBe("");
	});

	it("blocks a pan on the page behind", () => {
		const release = lockScroll(() => null);
		expect(pan(document.body, 100, 80).defaultPrevented).toBe(true);
		release();
	});

	it("lets a scroller inside the dialog scroll", () => {
		const dialog = document.createElement("div");
		document.body.append(dialog);
		const { child } = scroller(50, dialog);
		const release = lockScroll(() => dialog);
		expect(pan(child, 100, 80).defaultPrevented).toBe(false);
		release();
	});

	it("stops a pan chaining past either end of that scroller", () => {
		const dialog = document.createElement("div");
		document.body.append(dialog);
		const top = scroller(0, dialog);
		const end = scroller(400, dialog);
		const release = lockScroll(() => dialog);
		expect(pan(top.child, 80, 100).defaultPrevented).toBe(true);
		expect(pan(end.child, 100, 80).defaultPrevented).toBe(true);
		release();
	});

	it("leaves pinch zoom alone", () => {
		const release = lockScroll(() => null);
		expect(touch("touchmove", document.body, 80, 2).defaultPrevented).toBe(
			false,
		);
		release();
	});

	it("removes its listeners when released", () => {
		lockScroll(() => null)();
		expect(pan(document.body, 100, 80).defaultPrevented).toBe(false);
	});
});

describe("scrollParent", () => {
	it("finds the nearest scroller and stops at the root", () => {
		const { el, child } = scroller(0);
		expect(scrollParent(child, el)).toBe(el);
		expect(scrollParent(child, child)).toBeNull();
	});
});
