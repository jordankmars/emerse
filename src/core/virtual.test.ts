// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isVirtualClick, isVirtualPointerDown } from "./virtual";

afterEach(() => {
	vi.restoreAllMocks();
});

function android() {
	vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Linux; Android 15");
}

describe("isVirtualClick", () => {
	it("spots a click that came from nowhere", () => {
		expect(isVirtualClick(new MouseEvent("click", { detail: 0 }))).toBe(true);
	});

	it("leaves real clicks alone", () => {
		expect(isVirtualClick(new MouseEvent("click", { detail: 1 }))).toBe(false);
		expect(
			isVirtualClick(
				new PointerEvent("click", { detail: 0, pointerType: "touch" }),
			),
		).toBe(false);
	});

	it("uses the held button on Android", () => {
		android();
		const click = (buttons: number) =>
			new PointerEvent("click", { pointerType: "touch", buttons });
		expect(isVirtualClick(click(1))).toBe(true);
		expect(isVirtualClick(click(0))).toBe(false);
	});
});

describe("isVirtualPointerDown", () => {
	const down = (init: PointerEventInit) =>
		new PointerEvent("pointerdown", init);

	it("spots a zero-sized pointer", () => {
		expect(isVirtualPointerDown(down({ width: 0, height: 0 }))).toBe(true);
	});

	it("spots VoiceOver's stand-in mouse", () => {
		expect(
			isVirtualPointerDown(
				down({ width: 1, height: 1, pressure: 0, pointerType: "mouse" }),
			),
		).toBe(true);
	});

	it("leaves a real mouse alone", () => {
		expect(
			isVirtualPointerDown(
				down({ width: 1, height: 1, pressure: 0.5, pointerType: "mouse" }),
			),
		).toBe(false);
	});

	it("leaves a real finger alone", () => {
		expect(
			isVirtualPointerDown(
				down({ width: 24, height: 24, pressure: 0.6, pointerType: "touch" }),
			),
		).toBe(false);
	});
});
