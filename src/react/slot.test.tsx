// @vitest-environment jsdom
import { act, createRef, type MouseEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Slot } from "./slot";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;

function render(ui: React.ReactNode) {
	const host = document.body.appendChild(document.createElement("div"));
	root = createRoot(host);
	act(() => root.render(ui));
	return host;
}

afterEach(() => {
	act(() => root.unmount());
	document.body.replaceChildren();
});

describe("Slot", () => {
	it("renders the child with the slot's props", () => {
		const host = render(
			<Slot id="slot" aria-label="here">
				<a href="#x">Docs</a>
			</Slot>,
		);
		const a = host.querySelector("a");
		expect(a?.id).toBe("slot");
		expect(a?.getAttribute("aria-label")).toBe("here");
		expect(a?.getAttribute("href")).toBe("#x");
	});

	it("lets the child's own props win", () => {
		const host = render(
			<Slot id="slot">
				<a id="child" href="#x">
					Docs
				</a>
			</Slot>,
		);
		expect(host.querySelector("a")?.id).toBe("child");
	});

	it("joins class names and merges styles", () => {
		const host = render(
			<Slot className="a" style={{ color: "red", margin: 1 }}>
				<i className="b" style={{ color: "blue" }} />
			</Slot>,
		);
		const i = host.querySelector("i");
		expect(i?.className).toBe("a b");
		expect(i?.style.color).toBe("blue");
		expect(i?.style.margin).toBe("1px");
	});

	it("runs both handlers, the child's first", () => {
		const calls: string[] = [];
		const host = render(
			<Slot onClick={() => calls.push("slot")}>
				<button type="button" onClick={() => calls.push("child")} />
			</Slot>,
		);
		act(() => host.querySelector("button")?.click());
		expect(calls).toEqual(["child", "slot"]);
	});

	it("keeps the slot's handler when the child has none", () => {
		const onClick = vi.fn((_: MouseEvent) => {});
		const host = render(
			<Slot onClick={onClick}>
				<button type="button" />
			</Slot>,
		);
		act(() => host.querySelector("button")?.click());
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("feeds both refs", () => {
		const outer = createRef<HTMLElement>();
		const inner = createRef<HTMLButtonElement>();
		const host = render(
			<Slot ref={outer}>
				<button type="button" ref={inner} />
			</Slot>,
		);
		const button = host.querySelector("button");
		expect(outer.current).toBe(button);
		expect(inner.current).toBe(button);
	});

	it("rejects anything but a single element", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Slot>text</Slot>)).toThrow(/single element/);
		error.mockRestore();
	});
});
