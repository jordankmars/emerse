// Stops the page scrolling behind a dialog. Boxes are measured in page space,
// so the document has to keep its scroll offset: pinning the body with
// position: fixed would zero it and throw off everything measured before.
//
// overflow on <html> covers wheel and keyboard. iOS can still pan through it
// with a finger, so touch moves are filtered by hand.

/** The nearest element that really scrolls, from `from` up to `root`. */
export function scrollParent(
	from: Element | null,
	root: Element | null,
): Element | null {
	for (let el = from; el; el = el.parentElement) {
		if (el.scrollHeight > el.clientHeight) {
			const { overflowY } = getComputedStyle(el);
			if (overflowY === "auto" || overflowY === "scroll") return el;
		}
		if (el === root) break;
	}
	return null;
}

const allowed: (() => Element | null)[] = [];
let lastY = 0;
let unlock: (() => void) | null = null;

function onTouchStart(e: TouchEvent): void {
	lastY = e.touches[0].clientY;
}

function onTouchMove(e: TouchEvent): void {
	const y = e.touches[0].clientY;
	const dy = y - lastY;
	lastY = y;
	// Pinch zoom and range thumbs stay native. Once a pan has started, it's too late.
	if (!e.cancelable || e.touches.length > 1) return;
	const target = e.target as Element;
	if (target.closest("input[type=range]")) return;
	const root = allowed[allowed.length - 1]?.();
	const scroller = root?.contains(target) ? scrollParent(target, root) : null;
	if (scroller) {
		const atTop = scroller.scrollTop <= 0;
		const atEnd =
			scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
		// A scroller with room to move handles it. At its end, the pan would
		// chain to the page, so it stops here.
		if (!(dy > 0 && atTop) && !(dy < 0 && atEnd)) return;
	}
	e.preventDefault();
}

function lock(): () => void {
	const root = document.documentElement;
	const st = root.style;
	const { overflow, overscrollBehavior, scrollbarGutter } = st;
	if (innerWidth > root.clientWidth) st.scrollbarGutter = "stable";
	st.overflow = "hidden";
	st.overscrollBehavior = "none";
	const options = { passive: false };
	document.addEventListener("touchstart", onTouchStart, { passive: true });
	document.addEventListener("touchmove", onTouchMove, options);
	return () => {
		Object.assign(st, { overflow, overscrollBehavior, scrollbarGutter });
		document.removeEventListener("touchstart", onTouchStart);
		document.removeEventListener("touchmove", onTouchMove);
	};
}

/**
 * Locks page scroll until the returned function is called. `allow` is the
 * subtree that may still scroll, and the most recent lock's subtree wins.
 */
export function lockScroll(allow: () => Element | null): () => void {
	if (!allowed.length) unlock = lock();
	allowed.push(allow);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		allowed.splice(allowed.indexOf(allow), 1);
		if (!allowed.length) {
			unlock?.();
			unlock = null;
		}
	};
}
