import type { HTMLAttributes, SyntheticEvent } from "react";

// A portal's events still bubble through the React tree, so without this a pick
// would also fire the onClick of whatever row the Root sits in. This stops the
// native event too, so pointerup, pointermove and the touch events are left out:
// the core and the scroll lock listen for those further up, on window and document.
const STOPPED = [
	"onClick",
	"onDoubleClick",
	"onContextMenu",
	"onPointerDown",
	"onMouseDown",
	"onKeyDown",
	"onKeyUp",
] as const;

type Handler = (e: SyntheticEvent) => void;

/** Adds propagation stops around the consumer's own handlers. */
export function contain<T extends HTMLAttributes<HTMLElement>>(props: T): T {
	const out: Record<string, unknown> = { ...(props as object) };
	for (const name of STOPPED) {
		const own = props[name] as Handler | undefined;
		out[name] = (e: SyntheticEvent) => {
			own?.(e);
			e.stopPropagation();
		};
	}
	return out as T;
}
