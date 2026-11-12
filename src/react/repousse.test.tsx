// @vitest-environment jsdom
import { act, type ReactNode, StrictMode, useRef, useState } from "react";
import { createRoot, type Root as ReactRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure } from "../core";
import { Item } from "./item";
import { Menu } from "./menu";
import { Overlay } from "./overlay";
import { Root, type RootProps } from "./root";
import { Trigger } from "./trigger";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let roots: ReactRoot[] = [];
let consoleError: ReturnType<typeof vi.spyOn>;

function render(ui: ReactNode) {
	const host = document.body.appendChild(document.createElement("div"));
	const root = createRoot(host);
	roots.push(root);
	act(() => root.render(ui));
	return { host, root };
}

function pointer(
	type: string,
	target: EventTarget,
	init: PointerEventInit = {},
) {
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			button: 0,
			width: 20,
			height: 20,
			pressure: 0.5,
			...init,
		}),
	);
}

const triggers = () => [
	...document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]'),
];
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const items = () => [
	...document.querySelectorAll<HTMLElement>("[data-repousse-item]"),
];

function hold(el = triggers()[0]) {
	act(() => {
		pointer("pointerdown", el);
		vi.advanceTimersByTime(450);
	});
}

/** Opens without a drag, so the finger isn't still down afterwards. */
function rightClick(el = triggers()[0]) {
	act(() => {
		el.dispatchEvent(
			new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
		);
	});
}

function settle() {
	act(() => {
		vi.advanceTimersByTime(1);
	});
}

function example(
	props: RootProps = {},
	onReply?: () => void,
	menuProps: { align?: "start" | "end" } = {},
) {
	return (
		<Root {...props}>
			<Trigger>Message</Trigger>
			<Menu {...menuProps}>
				<Item onSelect={onReply}>Reply</Item>
				<Item disabled>Copy</Item>
			</Menu>
		</Root>
	);
}

/** A message whose only action deletes it. */
function Thread() {
	const [gone, setGone] = useState(false);
	return gone ? null : example({}, () => setGone(true));
}

/** The same, but it lets the menu finish closing first. */
function DeferredThread() {
	const [gone, setGone] = useState(false);
	const deleting = useRef(false);
	if (gone) return null;
	return example({ onClosed: () => deleting.current && setGone(true) }, () => {
		deleting.current = true;
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	configure({ reduced: true });
	consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
	act(() => {
		for (const root of roots) root.unmount();
	});
	roots = [];
	document.body.replaceChildren();
	vi.useRealTimers();
	configure({ reduced: null });
	expect(consoleError).not.toHaveBeenCalled();
	consoleError.mockRestore();
});

describe("Trigger", () => {
	it("renders a div with a button role and attaches to it", () => {
		const { host } = render(
			<Root>
				<Trigger>Message</Trigger>
			</Root>,
		);
		const el = host.querySelector("div");
		expect(el?.getAttribute("role")).toBe("button");
		expect(el?.getAttribute("aria-haspopup")).toBe("menu");
		expect(el?.tabIndex).toBe(0);
	});

	it("lets the role be replaced", () => {
		const { host } = render(
			<Root>
				<Trigger role="article">Message</Trigger>
			</Root>,
		);
		expect(host.querySelector("div")?.getAttribute("role")).toBe("article");
	});

	it("puts everything on the child with asChild", () => {
		const { host } = render(
			<Root>
				<Trigger asChild className="a">
					<button type="button" className="b">
						Message
					</button>
				</Trigger>
			</Root>,
		);
		expect(host.querySelector("div")).toBeNull();
		const button = host.querySelector("button");
		expect(button?.getAttribute("aria-haspopup")).toBe("menu");
		expect(button?.className).toBe("a b");
		expect(button?.hasAttribute("role")).toBe(false);
	});

	it("follows an asChild element that changes", () => {
		const view = (first: boolean) => (
			<Root>
				<Trigger asChild>
					{first ? <button type="button">A</button> : <a href="#b">B</a>}
				</Trigger>
			</Root>
		);
		const { host, root } = render(view(true));
		act(() => root.render(view(false)));
		expect(host.querySelector("a")?.getAttribute("aria-haspopup")).toBe("menu");
	});

	it("attaches again after StrictMode's double run", () => {
		const { host } = render(
			<StrictMode>
				<Root>
					<Trigger>Message</Trigger>
				</Root>
			</StrictMode>,
		);
		expect(host.querySelector("div")?.getAttribute("aria-haspopup")).toBe(
			"menu",
		);
	});

	it("needs a Root", () => {
		consoleError.mockImplementation(() => {});
		expect(() => render(<Trigger>Message</Trigger>)).toThrow(/Repousse.Root/);
		consoleError.mockClear();
	});
});

describe("Menu", () => {
	it("is absent until it opens, then leaves again", () => {
		render(example());
		expect(menu()).toBeNull();
		rightClick();
		expect(menu()?.parentElement).toBe(document.body);
		act(() => {
			pointer(
				"pointerdown",
				document.querySelector("[data-repousse-overlay]") as Element,
			);
		});
		settle();
		expect(menu()).toBeNull();
	});

	it("opens from a held press", () => {
		render(example());
		hold();
		expect(menu()).not.toBeNull();
	});

	it("goes into the given container", () => {
		const place = document.body.appendChild(document.createElement("section"));
		render(example({ container: place }));
		rightClick();
		expect(menu()?.parentElement).toBe(place);
	});

	it("stays open through prop changes", () => {
		const { root } = render(example());
		rightClick();
		const el = menu();
		act(() => root.render(example({}, () => {}, { align: "end" })));
		expect(menu()).toBe(el);
	});

	it("works under StrictMode", () => {
		render(<StrictMode>{example()}</StrictMode>);
		rightClick();
		expect(menu()).not.toBeNull();
	});

	it("puts everything back when unmounted while open", () => {
		const other = document.body.appendChild(document.createElement("div"));
		const { root } = render(example());
		rightClick();
		expect(other.hasAttribute("inert")).toBe(true);
		act(() => root.unmount());
		roots = [];
		expect(other.hasAttribute("inert")).toBe(false);
		expect(document.documentElement.style.overflow).toBe("");
		expect(document.querySelector("[data-repousse-overlay]")).toBeNull();
		expect(document.querySelector("[data-repousse-lifted]")).toBeNull();
	});

	it("doesn't send a pick to the React parent", () => {
		const onClick = vi.fn();
		render(
			// biome-ignore lint/a11y/noStaticElementInteractions: stands in for a clickable row.
			// biome-ignore lint/a11y/useKeyWithClickEvents: stands in for a clickable row.
			<div onClick={onClick}>{example()}</div>,
		);
		rightClick();
		act(() => items()[0].click());
		expect(onClick).not.toHaveBeenCalled();
	});
});

describe("Item", () => {
	it("is a button that core can find", () => {
		render(example());
		rightClick();
		const [reply] = items();
		expect(reply.tagName).toBe("BUTTON");
		expect(reply.getAttribute("type")).toBe("button");
		expect(reply.getAttribute("role")).toBe("menuitem");
		expect(reply.tabIndex).toBe(-1);
	});

	it("fires on a tap", () => {
		const onReply = vi.fn();
		render(example({}, onReply));
		rightClick();
		act(() => items()[0].click());
		expect(onReply).toHaveBeenCalledOnce();
	});

	it("fires on a drag released over it", () => {
		const onReply = vi.fn();
		render(example({}, onReply));
		hold();
		const [reply] = items();
		document.elementFromPoint = () => reply;
		act(() => pointer("pointermove", reply));
		// On the item itself, as a mouse sends it, so it has to reach the window.
		act(() => pointer("pointerup", reply));
		expect(onReply).toHaveBeenCalledOnce();
	});

	it("fires from the keyboard", () => {
		const onReply = vi.fn();
		render(example({}, onReply));
		act(() => {
			triggers()[0].focus();
			triggers()[0].dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});
		expect(document.activeElement).toBe(items()[0]);
		act(() => {
			items()[0].dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});
		expect(onReply).toHaveBeenCalledOnce();
	});

	it("uses the latest handler", () => {
		const stale = vi.fn();
		const fresh = vi.fn();
		const { root } = render(example({}, stale));
		rightClick();
		act(() => root.render(example({}, fresh)));
		act(() => items()[0].click());
		expect(stale).not.toHaveBeenCalled();
		expect(fresh).toHaveBeenCalledOnce();
	});

	it("skips disabled items", () => {
		const onCopy = vi.fn();
		render(
			<Root>
				<Trigger>Message</Trigger>
				<Menu>
					<Item disabled onSelect={onCopy}>
						Copy
					</Item>
				</Menu>
			</Root>,
		);
		rightClick();
		act(() => items()[0].click());
		expect(onCopy).not.toHaveBeenCalled();
		expect(menu()).not.toBeNull();
	});

	it("lands on the child with asChild, and disables by attribute", () => {
		render(
			<Root>
				<Trigger>Message</Trigger>
				<Menu>
					<Item asChild disabled>
						<a href="#x">Open thread</a>
					</Item>
				</Menu>
			</Root>,
		);
		rightClick();
		const [link] = items();
		expect(link.tagName).toBe("A");
		expect(link.getAttribute("aria-disabled")).toBe("true");
		expect(link.hasAttribute("disabled")).toBe(false);
	});

	it("stops a disabled asChild link navigating", () => {
		render(
			<Root>
				<Trigger>Message</Trigger>
				<Menu>
					<Item asChild disabled>
						<a href="#x">Open thread</a>
					</Item>
				</Menu>
			</Root>,
		);
		rightClick();
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		act(() => {
			items()[0].dispatchEvent(click);
		});
		expect(click.defaultPrevented).toBe(true);
		expect(menu()).not.toBeNull();
	});

	it("leaves an enabled asChild link alone", () => {
		const onClick = vi.fn();
		render(
			<Root>
				<Trigger>Message</Trigger>
				<Menu>
					<Item asChild onClick={onClick}>
						<a href="#x">Open thread</a>
					</Item>
				</Menu>
			</Root>,
		);
		rightClick();
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		act(() => {
			items()[0].dispatchEvent(click);
		});
		expect(click.defaultPrevented).toBe(false);
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("can remove its own Root", () => {
		render(<Thread />);
		rightClick();
		act(() => items()[0].click());
		settle();
		expect(menu()).toBeNull();
		expect(document.querySelector("[data-repousse-overlay]")).toBeNull();
		expect(document.querySelector("[data-repousse-lifted]")).toBeNull();
		expect(document.documentElement.style.overflow).toBe("");
	});
});

describe("onClosed", () => {
	it("waits for the close to finish, and fires once", () => {
		const onClosed = vi.fn();
		render(example({ onClosed }));
		rightClick();
		expect(onClosed).not.toHaveBeenCalled();
		act(() => items()[0].click());
		expect(onClosed).not.toHaveBeenCalled();
		settle();
		expect(onClosed).toHaveBeenCalledOnce();
		expect(menu()).toBeNull();
	});

	it("fires when another menu takes over", () => {
		const onClosed = vi.fn();
		render(
			<>
				{example({ onClosed })}
				{example()}
			</>,
		);
		rightClick(triggers()[0]);
		rightClick(triggers()[1]);
		expect(onClosed).toHaveBeenCalledOnce();
	});

	it("can remove the Root without cutting the close short", () => {
		render(<DeferredThread />);
		rightClick();
		const el = menu();
		act(() => items()[0].click());
		expect(menu()).toBe(el);
		expect(document.querySelector("[data-repousse-lifted]")).not.toBeNull();
		settle();
		expect(document.body.textContent).not.toContain("Message");
		expect(menu()).toBeNull();
		expect(document.querySelector("[data-repousse-overlay]")).toBeNull();
		expect(document.querySelector("[data-repousse-lifted]")).toBeNull();
		expect(document.documentElement.style.overflow).toBe("");
	});
});

describe("Overlay", () => {
	const overlays = () => [
		...document.querySelectorAll<HTMLElement>("[data-repousse-overlay]"),
	];

	function withOverlay() {
		return (
			<Root>
				<Trigger>Message</Trigger>
				<Menu>
					<Item>Reply</Item>
				</Menu>
				<Overlay className="scrim" id="mine" />
			</Root>
		);
	}

	it("is absent until the menu opens", () => {
		render(withOverlay());
		expect(document.getElementById("mine")).toBeNull();
	});

	it("becomes the overlay, beneath the copy and the menu", () => {
		render(withOverlay());
		rightClick();
		const [overlay] = overlays();
		expect(overlays()).toHaveLength(1);
		expect(overlay.id).toBe("mine");
		expect(overlay.className).toBe("scrim");
		expect(
			overlay.nextElementSibling?.hasAttribute("data-repousse-lifted"),
		).toBe(true);
		expect(overlay.nextElementSibling?.nextElementSibling).toBe(menu());
	});

	it("adds no look of its own", () => {
		render(withOverlay());
		rightClick();
		const { style } = overlays()[0];
		expect(style.background).toBe("");
		expect(style.getPropertyValue("backdrop-filter")).toBe("");
		expect(style.zIndex).toBe("");
	});

	it("dismisses, then unmounts", () => {
		render(withOverlay());
		rightClick();
		act(() => pointer("pointerdown", overlays()[0]));
		settle();
		expect(menu()).toBeNull();
		expect(overlays()).toHaveLength(0);
	});

	it("is replaced by a bare layer when left out", () => {
		render(example());
		rightClick();
		expect(overlays()).toHaveLength(1);
		expect(overlays()[0].className).toBe("");
	});

	it("doesn't send presses to the React parent", () => {
		const onPointerDown = vi.fn();
		render(<div onPointerDown={onPointerDown}>{withOverlay()}</div>);
		rightClick();
		act(() => pointer("pointerdown", overlays()[0]));
		expect(onPointerDown).not.toHaveBeenCalled();
	});
});

describe("onOpenChange", () => {
	it("reports the start of opening and of closing, once each", () => {
		const onOpenChange = vi.fn();
		render(example({ onOpenChange }));
		rightClick();
		expect(onOpenChange.mock.calls).toEqual([[true]]);
		act(() => items()[0].click());
		settle();
		expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
	});

	it("reports the old menu closing when another takes over", () => {
		const first = vi.fn();
		const second = vi.fn();
		render(
			<>
				{example({ onOpenChange: first })}
				{example({ onOpenChange: second })}
			</>,
		);
		rightClick(triggers()[0]);
		// The second trigger is inert by now, but a programmatic event still lands.
		rightClick(triggers()[1]);
		expect(first.mock.calls).toEqual([[true], [false]]);
		expect(second.mock.calls).toEqual([[true]]);
		expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
	});
});

it("renders on a server", () => {
	const html = renderToString(
		<Root>
			<Trigger>Message</Trigger>
			<Menu>
				<Item>Reply</Item>
			</Menu>
		</Root>,
	);
	expect(html).toContain("Message");
	expect(html).not.toContain("Reply");
});
