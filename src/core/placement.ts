// Where the menu goes: under the trigger if it fits, over it if not, and always
// on screen sideways. Everything here is in viewport coordinates.

export interface View {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface MenuPlacement {
	left: number;
	top: number;
	/** False when the menu flipped above the trigger. */
	below: boolean;
}

type TriggerRect = Pick<DOMRect, "left" | "right" | "top" | "bottom">;

/** Space between the trigger and the menu. */
const GAP = 10;
/** Keeps the menu this far from the edge of the viewport. */
const MARGIN = 8;

export function placeMenu(
	trigger: TriggerRect,
	size: { w: number; h: number },
	view: View,
	edge: "left" | "right",
): MenuPlacement {
	const below = trigger.bottom + GAP + size.h < view.y + view.h - MARGIN;
	const top = below
		? trigger.bottom + GAP
		: Math.max(view.y + MARGIN, trigger.top - GAP - size.h);
	const x = edge === "right" ? trigger.right - size.w : trigger.left;
	const left = Math.min(
		view.x + view.w - size.w - MARGIN,
		Math.max(view.x + MARGIN, x),
	);
	return { left, top, below };
}
