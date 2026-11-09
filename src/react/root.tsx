import {
	type ReactNode,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import { Peek } from "../core";
import { type Bridge, EmerseContext } from "./context";

export interface RootProps {
	/** Told when the menu starts opening and when it starts closing. */
	onOpenChange?: (open: boolean) => void;
	/** Told once the close has finished. Remove the item from here, if you're going to. */
	onClosed?: () => void;
	/** Where the menu, overlay and lifted copy go. Defaults to the body. */
	container?: Element | null;
	children?: ReactNode;
}

type Latest = Pick<RootProps, "onOpenChange" | "onClosed" | "container">;

function createBridge(
	setOpen: (open: boolean) => void,
	latest: RefObject<Latest>,
): Bridge {
	const triggerRef: RefObject<HTMLElement | null> = { current: null };
	const menuRef: RefObject<HTMLElement | null> = { current: null };
	const overlayRef: RefObject<HTMLElement | null> = { current: null };
	const handlers = new WeakMap<HTMLElement, () => void>();
	const container = () => latest.current.container ?? document.body;
	let destroying = false;
	let announced = false;

	const peek = new Peek({
		trigger: () => triggerRef.current,
		menu: () => menuRef.current,
		overlay: () => overlayRef.current,
		container,
		// flushSync can't flush from inside an effect, which is where destroy runs.
		commit: (next) => {
			if (destroying) setOpen(next);
			else flushSync(() => setOpen(next));
		},
		onSelect: (item) => handlers.get(item)?.(),
		onPhase: (phase) => {
			const open = phase === "opening" || phase === "open";
			if (open !== announced) {
				announced = open;
				latest.current.onOpenChange?.(open);
			}
			if (phase === "closed") latest.current.onClosed?.();
		},
	});

	return {
		peek,
		triggerRef,
		menuRef,
		overlayRef,
		handlers,
		container,
		destroy: () => {
			destroying = true;
			try {
				peek.destroy();
			} finally {
				destroying = false;
			}
		},
	};
}

export function Root({
	onOpenChange,
	onClosed,
	container,
	children,
}: RootProps) {
	const [open, setOpen] = useState(false);
	const latest = useRef<Latest>({ onOpenChange, onClosed, container });
	useEffect(() => {
		latest.current = { onOpenChange, onClosed, container };
	});
	const [bridge] = useState(() => createBridge(setOpen, latest));
	const value = useMemo(() => ({ ...bridge, open }), [bridge, open]);
	return (
		<EmerseContext.Provider value={value}>{children}</EmerseContext.Provider>
	);
}
