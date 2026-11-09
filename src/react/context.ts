import { createContext, type RefObject, useContext } from "react";
import type { Peek } from "../core";

export interface Bridge {
	peek: Peek;
	triggerRef: RefObject<HTMLElement | null>;
	menuRef: RefObject<HTMLElement | null>;
	overlayRef: RefObject<HTMLElement | null>;
	/** What each item does when picked, since a pick isn't always a click. */
	handlers: WeakMap<HTMLElement, () => void>;
	/** Only called while open, so it's free to reach for the document. */
	container: () => Element;
	destroy: () => void;
}

export interface EmerseContextValue extends Bridge {
	open: boolean;
}

export const EmerseContext = createContext<EmerseContextValue | null>(null);

export function useEmerse(part: string): EmerseContextValue {
	const value = useContext(EmerseContext);
	if (!value) throw new Error(`emerse: ${part} must be inside Emerse.Root.`);
	return value;
}
