// @vitest-environment jsdom
import { act, type ReactNode, StrictMode } from "react";
import { createRoot, type Root as ReactRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure } from "../core";
import { Root } from "./root";
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
		expect(() => render(<Trigger>Message</Trigger>)).toThrow(/Emerse.Root/);
		consoleError.mockClear();
	});
});

it("renders on a server", () => {
	const html = renderToString(
		<Root>
			<Trigger>Message</Trigger>
		</Root>,
	);
	expect(html).toContain("Message");
});
