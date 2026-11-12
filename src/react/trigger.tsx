import { forwardRef, type HTMLAttributes, type Ref, useEffect } from "react";
import { useRepousse } from "./context";
import { Slot, useComposedRefs } from "./slot";

export interface TriggerProps extends HTMLAttributes<HTMLDivElement> {
	/** Puts the behaviour on your own element instead of rendering a div. */
	asChild?: boolean;
	/** Builds the lifted copy, for content a plain clone can't reproduce. */
	clone?: (trigger: HTMLElement) => HTMLElement;
}

export const Trigger = forwardRef<HTMLDivElement, TriggerProps>(
	function Trigger({ asChild, clone, ...props }, forwarded) {
		const { peek, triggerRef, destroy } = useRepousse("Trigger");
		const ref = useComposedRefs(triggerRef as Ref<HTMLDivElement>, forwarded);

		useEffect(() => {
			peek.update({ clone });
		}, [peek, clone]);

		// On every commit, because asChild can swap the element underneath.
		useEffect(() => {
			peek.attach();
		});

		useEffect(() => destroy, [destroy]);

		if (asChild) return <Slot ref={ref} {...props} />;
		// biome-ignore lint/a11y/useSemanticElements: a trigger can hold links and blocks, which a button can't.
		return <div ref={ref} role="button" tabIndex={0} {...props} />;
	},
);
