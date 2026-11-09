// Screen readers activate things without a real press: a click that no finger
// or mouse produced, and on some platforms a stand-in pointer event first.
// There's no flag for it, so these go by the shape of the event.

type MaybePointer = MouseEvent & {
	pointerType?: string;
	mozInputSource?: number;
};

function isAndroid(): boolean {
	return /Android/i.test(navigator.userAgent);
}

export function isVirtualClick(e: MaybePointer): boolean {
	if (e.mozInputSource === 0 && e.isTrusted) return true;
	if (isAndroid() && e.pointerType) return e.buttons === 1;
	return e.detail === 0 && !e.pointerType;
}

export function isVirtualPointerDown(e: PointerEvent): boolean {
	if (!isAndroid() && e.width === 0 && e.height === 0) return true;
	return (
		e.width === 1 &&
		e.height === 1 &&
		e.pressure === 0 &&
		e.detail === 0 &&
		e.pointerType === "mouse"
	);
}
