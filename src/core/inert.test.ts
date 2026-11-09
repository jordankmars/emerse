// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { inertOthers } from "./inert";

function page() {
	document.body.innerHTML = `
		<main id="main"></main>
		<div id="portal"><div id="side"></div><div id="dialog"></div></div>
		<aside id="aside" inert></aside>
	`;
	return (id: string) => document.getElementById(id) as HTMLElement;
}

const isInert = (el: Element) => el.hasAttribute("inert");

afterEach(() => {
	document.body.innerHTML = "";
});

describe("inertOthers", () => {
	it("covers siblings along the path to the body, not the path", () => {
		const $ = page();
		const undo = inertOthers([$("dialog")]);
		expect(isInert($("main"))).toBe(true);
		expect(isInert($("side"))).toBe(true);
		expect(isInert($("portal"))).toBe(false);
		expect(isInert($("dialog"))).toBe(false);
		undo();
		expect(isInert($("main"))).toBe(false);
		expect(isInert($("side"))).toBe(false);
	});

	it("leaves alone what was already inert", () => {
		const $ = page();
		inertOthers([$("dialog")])();
		expect(isInert($("aside"))).toBe(true);
	});

	it("holds until the last dialog lets go, in any order", () => {
		const $ = page();
		const first = inertOthers([$("dialog")]);
		const second = inertOthers([$("dialog")]);
		first();
		expect(isInert($("main"))).toBe(true);
		second();
		expect(isInert($("main"))).toBe(false);
	});
});

describe("inertOthers with several elements", () => {
	it("keeps each of them and what's around them", () => {
		const shared = document.body.appendChild(document.createElement("div"));
		const a = shared.appendChild(document.createElement("div"));
		const b = document.body.appendChild(document.createElement("div"));
		const out = document.body.appendChild(document.createElement("div"));
		const sibling = shared.appendChild(document.createElement("div"));
		const release = inertOthers([a, b]);
		expect(a.hasAttribute("inert")).toBe(false);
		expect(b.hasAttribute("inert")).toBe(false);
		expect(shared.hasAttribute("inert")).toBe(false);
		expect(out.hasAttribute("inert")).toBe(true);
		expect(sibling.hasAttribute("inert")).toBe(true);
		release();
		expect(out.hasAttribute("inert")).toBe(false);
		document.body.replaceChildren();
	});
});
