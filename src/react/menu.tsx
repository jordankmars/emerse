import { forwardRef, type HTMLAttributes, type Ref, useEffect } from "react";
import { createPortal } from "react-dom";
import { contain } from "./contain";
import { useRepousse } from "./context";
import { useComposedRefs } from "./slot";

export interface MenuProps extends HTMLAttributes<HTMLDivElement> {
	/** Which edge of the trigger the menu lines up with. */
	align?: "start" | "end";
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
	{ align, ...props },
	forwarded,
) {
	const { peek, open, menuRef, container } = useRepousse("Menu");
	const ref = useComposedRefs(menuRef as Ref<HTMLDivElement>, forwarded);

	useEffect(() => {
		peek.update({ align });
	}, [peek, align]);

	if (!open) return null;
	return createPortal(
		<div ref={ref} role="menu" {...contain(props)} />,
		container(),
	);
});
