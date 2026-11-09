// The copy that lifts above the page. It lands in a different part of the
// document, so CSS scoped to the trigger's ancestors stops applying. Its own
// computed look is written inline to make up for that, minus anything that's
// about layout or motion: peek sets those itself, and a copied transition
// would drag behind the spring.

const SKIP =
	/^(position|top|right|bottom|left|inset|margin|width|height|min-|max-|block-size|inline-size|transform|translate|rotate|scale|transition|animation|visibility|box-shadow|z-index|pointer-events)/;

export function cloneTrigger(trigger: HTMLElement): HTMLElement {
	const copy = trigger.cloneNode(true) as HTMLElement;
	for (const el of [copy, ...copy.querySelectorAll("*")]) {
		el.removeAttribute("id");
		el.removeAttribute("name");
		el.removeAttribute("tabindex");
	}
	const computed = getComputedStyle(trigger);
	for (const prop of computed) {
		if (!SKIP.test(prop)) {
			copy.style.setProperty(prop, computed.getPropertyValue(prop));
		}
	}
	return copy;
}
