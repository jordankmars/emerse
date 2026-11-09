// Everything but a few subtrees goes inert. These can overlap, so each element
// counts how many want it inert and is only released by the last of them.

const holds = new Map<Element, number>();

/** Makes everything outside `keep` inert. Returns the function that undoes it. */
export function inertOthers(keep: Element[]): () => void {
	const path = new Set<Element>();
	for (const el of keep) {
		for (
			let node: Element | null = el;
			node && node !== document.body;
			node = node.parentElement
		) {
			path.add(node);
		}
	}

	const held = new Set<Element>();
	for (const node of path) {
		for (const sibling of node.parentElement?.children ?? []) {
			if (path.has(sibling) || held.has(sibling)) continue;
			const count = holds.get(sibling);
			// Inert before we got here means it isn't ours to release.
			if (!count && sibling.hasAttribute("inert")) continue;
			sibling.setAttribute("inert", "");
			holds.set(sibling, (count ?? 0) + 1);
			held.add(sibling);
		}
	}

	return () => {
		for (const el of held) {
			const count = (holds.get(el) ?? 1) - 1;
			if (count) {
				holds.set(el, count);
			} else {
				holds.delete(el);
				el.removeAttribute("inert");
			}
		}
	};
}
