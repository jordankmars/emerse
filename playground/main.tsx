import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Motion } from "../src/core/motion";
import { Press } from "../src/core/press";

// Everything the playground does lives in this file on purpose: it talks to the
// core directly, so the core can be tried out before there's a React adapter.

const css = `
:root {
	--bg: #f6f6f8;
	--surface: #ffffff;
	--stage: #ececf0;
	--fg: #16161a;
	--muted: #6a6a75;
	--line: #e2e2e8;
	--accent: #2d55e0;
	--scrim: rgba(246, 246, 248, 0.45);
	--sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
	--mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
	color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
	:root {
		--bg: #0e0e11;
		--surface: #1a1a1f;
		--stage: #121216;
		--fg: #ececf1;
		--muted: #9b9ba8;
		--line: #2a2a31;
		--accent: #7390ff;
		--scrim: rgba(14, 14, 17, 0.5);
	}
}
* { box-sizing: border-box; }
body {
	margin: 0;
	background: var(--bg);
	color: var(--fg);
	font: 14px/1.5 var(--sans);
	-webkit-font-smoothing: antialiased;
}
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
h1, h2, p { margin: 0; }
.wrap { max-width: 720px; margin: 0 auto; padding: 40px 16px 64px; display: grid; gap: 16px; }
.wrap h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.025em; }
.demo { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 12px; }
.demo h2 { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.demo > p { color: var(--muted); font-size: 13px; }
.stage { position: relative; min-height: 240px; background: var(--stage); border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 16px; }
.note { font-size: 12px; color: var(--muted); text-align: center; }
.column { display: grid; gap: 12px; justify-items: center; }
.bubble { max-width: 78%; padding: 8px 13px; border-radius: 18px; background: var(--surface); text-align: left; cursor: default; }
.bubble.me { background: var(--accent); color: #fff; }
`;

// The recogniser on its own, before anything opens: shrink while held, then say
// what the press turned into.
function PressDemo() {
	const ref = useRef<HTMLButtonElement>(null);
	const [status, setStatus] = useState("Hold for half a second");

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const squeeze = new Motion(
			1,
			{ duration: 0.45, bounce: 0, rest: 0.001 },
			(s) => {
				el.style.transform = s === 1 ? "" : `scale(${s})`;
			},
		);
		const press = new Press({
			onFire: () => {
				squeeze.set(1);
				setStatus("Long press");
			},
			onCancel: () => {
				squeeze.set(1);
				setStatus("Cancelled");
			},
		});
		const down = (e: PointerEvent) => {
			if (e.button === 0 && press.down(e.pointerId, e.clientX, e.clientY)) {
				squeeze.set(0.95);
				setStatus("Holding");
			}
		};
		const move = (e: PointerEvent) =>
			press.move(e.pointerId, e.clientX, e.clientY);
		const up = (e: PointerEvent) => press.up(e.pointerId);
		el.addEventListener("pointerdown", down);
		addEventListener("pointermove", move);
		addEventListener("pointerup", up);
		addEventListener("pointercancel", up);
		return () => {
			el.removeEventListener("pointerdown", down);
			removeEventListener("pointermove", move);
			removeEventListener("pointerup", up);
			removeEventListener("pointercancel", up);
			press.cancel();
			squeeze.stop();
		};
	}, []);

	return (
		<section className="demo">
			<h2>Long press</h2>
			<p>Hold still to fire. Move more than 8px or let go early to cancel.</p>
			<div className="stage column">
				<button ref={ref} type="button" className="bubble">
					Press and hold me
				</button>
				<p className="note">{status}</p>
			</div>
		</section>
	);
}

function App() {
	return (
		<main className="wrap">
			<style>{css}</style>
			<h1>emerse playground</h1>
			<PressDemo />
		</main>
	);
}

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
