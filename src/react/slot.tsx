import {
	type CSSProperties,
	cloneElement,
	forwardRef,
	type HTMLAttributes,
	isValidElement,
	type ReactElement,
	type Ref,
	useCallback,
	version,
} from "react";

type AnyProps = Record<string, unknown>;

function assign<T>(ref: Ref<T> | undefined, value: T | null): void {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
}

/** One callback ref that feeds all of them. Stable while they are. */
export function useComposedRefs<T>(
	a?: Ref<T>,
	b?: Ref<T>,
): (el: T | null) => void {
	return useCallback(
		(el: T | null) => {
			assign(a, el);
			assign(b, el);
		},
		[a, b],
	);
}

/** Reading the other one logs a warning on either side of React 19. */
function refOf(element: ReactElement): Ref<unknown> | undefined {
	return Number.parseInt(version, 10) >= 19
		? (element.props as { ref?: Ref<unknown> }).ref
		: (element as unknown as { ref?: Ref<unknown> }).ref;
}

const isHandler = (key: string) => /^on[A-Z]/.test(key);

/** The child's props win, except the ones that can sensibly be combined. */
function merge(slot: AnyProps, child: AnyProps): AnyProps {
	const merged = { ...slot, ...child };
	for (const key of Object.keys(child)) {
		const own = slot[key];
		const theirs = child[key];
		if (isHandler(key) && typeof own === "function") {
			merged[key] =
				typeof theirs === "function"
					? (...args: unknown[]) => {
							theirs(...args);
							own(...args);
						}
					: own;
		}
	}
	const className = [slot.className, child.className].filter(Boolean).join(" ");
	if (className) merged.className = className;
	if (slot.style || child.style) {
		merged.style = {
			...(slot.style as CSSProperties),
			...(child.style as CSSProperties),
		};
	}
	return merged;
}

/** Puts its props and ref on its only child instead of rendering an element. */
export const Slot = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
	function Slot({ children, ...props }, forwarded) {
		if (!isValidElement(children)) {
			throw new Error("repousse: asChild needs a single element as its child.");
		}
		const ref = useComposedRefs(
			forwarded,
			refOf(children) as Ref<HTMLElement> | undefined,
		);
		return cloneElement(children, {
			...merge(props, children.props as AnyProps),
			ref,
		} as AnyProps);
	},
);
