import { describe, expect, it } from "vitest";
import { placeMenu } from "./placement";

const view = { x: 0, y: 0, w: 400, h: 800 };
const size = { w: 210, h: 160 };
const trigger = (top: number, left = 100, w = 100, h = 40) => ({
	top,
	left,
	right: left + w,
	bottom: top + h,
});

describe("placeMenu", () => {
	it("goes below with a 10px gap when there's room", () => {
		expect(placeMenu(trigger(100), size, view, "left")).toEqual({
			left: 100,
			top: 150,
			below: true,
		});
	});

	it("flips above when it wouldn't fit below", () => {
		const place = placeMenu(trigger(700), size, view, "left");
		expect(place.below).toBe(false);
		expect(place.top).toBe(530);
	});

	it("flips when it would land inside the margin", () => {
		// A bottom of 622 puts the menu's end exactly on the 8px margin.
		expect(placeMenu(trigger(582), size, view, "left").below).toBe(false);
		expect(placeMenu(trigger(581), size, view, "left").below).toBe(true);
	});

	it("pins to the top margin when neither side fits", () => {
		const short = { ...view, h: 200 };
		expect(placeMenu(trigger(60), size, short, "left").top).toBe(8);
	});

	it("lines up with the right edge when asked", () => {
		expect(placeMenu(trigger(100, 250), size, view, "right").left).toBe(140);
	});

	it("stays 8px inside both sides", () => {
		expect(placeMenu(trigger(100, 300), size, view, "left").left).toBe(182);
		expect(placeMenu(trigger(100, 2, 50), size, view, "right").left).toBe(8);
	});

	it("respects a viewport that doesn't start at zero", () => {
		const pinched = { x: 50, y: 100, w: 300, h: 400 };
		const place = placeMenu(trigger(120, 10), size, pinched, "left");
		expect(place.left).toBe(58);
		expect(place.top).toBe(170);
	});
});
