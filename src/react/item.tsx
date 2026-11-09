import {
	type ButtonHTMLAttributes,
	forwardRef,
	type Ref,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { useEmerse } from "./context";
import { Slot, useComposedRefs } from "./slot";

export interface ItemProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
	/** Puts the behaviour on your own element instead of rendering a button. */
	asChild?: boolean;
	/** The item was picked, by drag, tap or keyboard. */
	onSelect?: () => void;
}

export const Item = forwardRef<HTMLButtonElement, ItemProps>(function Item(
	{ asChild, onSelect, disabled, ...props },
	forwarded,
) {
	const { handlers } = useEmerse("Item");
	const latest = useRef(onSelect);
	useEffect(() => {
		latest.current = onSelect;
	});
	const register = useCallback(
		(el: HTMLButtonElement | null) => {
			if (el) handlers.set(el, () => latest.current?.());
		},
		[handlers],
	);
	const ref = useComposedRefs<HTMLButtonElement>(register, forwarded);
	const shared = {
		"data-emerse-item": "",
		role: "menuitem",
		tabIndex: -1,
		...props,
	};

	if (asChild) {
		return (
			<Slot
				ref={ref as Ref<HTMLElement>}
				aria-disabled={disabled ? true : undefined}
				{...(shared as object)}
			/>
		);
	}
	return <button ref={ref} type="button" disabled={disabled} {...shared} />;
});
