import { forwardRef, type HTMLAttributes, type Ref } from "react";
import { createPortal } from "react-dom";
import { contain } from "./contain";
import { useEmerse } from "./context";
import { useComposedRefs } from "./slot";

export type OverlayProps = HTMLAttributes<HTMLDivElement>;

/** The layer behind the lifted item. It has no look until you give it one. */
export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(
	function Overlay(props, forwarded) {
		const { open, overlayRef, container } = useEmerse("Overlay");
		const ref = useComposedRefs(overlayRef as Ref<HTMLDivElement>, forwarded);
		if (!open) return null;
		return createPortal(<div ref={ref} {...contain(props)} />, container());
	},
);
