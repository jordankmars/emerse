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

export interface RepousseContextValue extends Bridge {
	open: boolean;
}

export const RepousseContext = createContext<RepousseContextValue | null>(null);

export function useRepousse(part: string): RepousseContextValue {
	const value = useContext(RepousseContext);
	if (!value)
		throw new Error(`repousse: ${part} must be inside Repousse.Root.`);
	return value;
}
