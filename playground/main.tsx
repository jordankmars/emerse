import { StrictMode, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { configure, Peek } from "../src/core";
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
.chat { width: min(100%, 320px); display: flex; flex-direction: column; gap: 8px; }
.bubble { max-width: 78%; padding: 8px 13px; border-radius: 18px; background: var(--surface); align-self: flex-start; text-align: left; cursor: default; }
.bubble.me { align-self: flex-end; background: var(--accent); color: #fff; }
[data-emerse-overlay] { z-index: 60; background: var(--scrim); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
[data-emerse-lifted] { z-index: 61; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); }
.corners .bubble, .scroller .bubble { display: block; }
.scroller { height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--stage); border-radius: 10px; }
.corners { position: relative; height: 240px; background: var(--stage); border-radius: 10px; }
.controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 13px; color: var(--muted); }
.controls label { display: flex; gap: 6px; align-items: center; }
.log { font-family: var(--mono); font-size: 11.5px; color: var(--muted); min-height: 150px; margin: 0; white-space: pre-wrap; }
.pmenu { z-index: 62; width: 210px; background: var(--surface); border-radius: 14px; padding: 5px; display: grid; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--line); }
.pmenu button { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border-radius: 9px; text-align: left; cursor: default; }
.pmenu button span { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.pmenu button[data-highlighted], .pmenu button:hover { background: var(--stage); }
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

// Set once the app has mounted, so any bubble can write to the event log.
let log: (line: string) => void = () => {};

const ITEMS = [
	["Reply", "↩"],
	["Copy", "⌘C"],
	["Pin", "P"],
	["Forward", "→"],
];

function Bubble({
	text,
	me = false,
	onPick,
}: {
	text: string;
	me?: boolean;
	onPick: (label: string) => void;
}) {
	const trigger = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const pick = useRef(onPick);
	pick.current = onPick;

	useEffect(() => {
		const peek = new Peek({
			trigger: () => trigger.current,
			menu: () => menu.current,
			commit: (next) => flushSync(() => setOpen(next)),
			align: me ? "end" : "start",
			onSelect: (item) => {
				const label = item.dataset.emerseItem ?? "";
				log(`select  ${label}`);
				pick.current(label);
			},
			onPhase: (phase) => log(`phase   ${phase}`),
		});
		peek.attach();
		return () => peek.destroy();
	}, [me]);

	return (
		<>
			<button
				ref={trigger}
				type="button"
				className={me ? "bubble me" : "bubble"}
				onClick={() => log("click   the trigger")}
			>
				{text}
			</button>
			{open &&
				createPortal(
					<div ref={menu} className="pmenu">
						{ITEMS.map(([label, hint]) => (
							<button key={label} type="button" data-emerse-item={label}>
								{label}
								<span>{hint}</span>
							</button>
						))}
					</div>,
					document.body,
				)}
		</>
	);
}

function ChatDemo() {
	const [status, setStatus] = useState("Hold for half a second");
	const onPick = (label: string) =>
		setStatus(
			{
				Reply: "Replying",
				Copy: "Copied to clipboard",
				Pin: "Pinned to the top",
				Forward: "Pick someone to forward to",
			}[label] ?? label,
		);

	return (
		<section className="demo">
			<h2>Peek menu</h2>
			<p>
				Press and hold a message. Keep your finger down and slide onto an option
				to pick it in one motion.
			</p>
			<div className="stage column">
				<div className="chat">
					<Bubble text="Are we still on for dinner?" onPick={onPick} />
					<Bubble text="Yes! See you at 7?" me onPick={onPick} />
					<Bubble
						text="Perfect. I'll book the table by the window."
						onPick={onPick}
					/>
				</div>
				<p className="note">{status}</p>
			</div>
		</section>
	);
}

const NOTES = Array.from({ length: 24 }, (_, i) => `Message number ${i + 1}`);

function ScrollDemo() {
	const [status, setStatus] = useState("Start a scroll on a message");
	return (
		<section className="demo">
			<h2>Scroll or press</h2>
			<p>
				A finger that moves is scrolling. One that stays put opens the menu.
				Text in these can be selected with a mouse by dragging.
			</p>
			<div className="scroller">
				{NOTES.map((note, i) => (
					<Bubble
						key={note}
						text={note}
						me={i % 3 === 0}
						onPick={(label) => setStatus(`${label}: ${note}`)}
					/>
				))}
			</div>
			<p className="note">{status}</p>
		</section>
	);
}

function CornersDemo() {
	const [status, setStatus] = useState("Try each corner");
	const onPick = (label: string) => setStatus(label);
	return (
		<section className="demo">
			<h2>Placement</h2>
			<p>
				The menu goes below when there's room, above when there isn't, and stays
				on screen sideways. Scroll one of these to the bottom of the window to
				see it flip.
			</p>
			<div className="corners">
				<div style={{ position: "absolute", top: 8, left: 8 }}>
					<Bubble text="Top left" onPick={onPick} />
				</div>
				<div style={{ position: "absolute", top: 8, right: 8 }}>
					<Bubble text="Top right" me onPick={onPick} />
				</div>
				<div style={{ position: "absolute", bottom: 8, left: 8 }}>
					<Bubble text="Bottom left" onPick={onPick} />
				</div>
				<div style={{ position: "absolute", bottom: 8, right: 8 }}>
					<Bubble text="Bottom right" me onPick={onPick} />
				</div>
			</div>
			<p className="note">{status}</p>
		</section>
	);
}

function Controls() {
	const [speed, setSpeed] = useState(1);
	const [motion, setMotion] = useState("system");

	useEffect(() => {
		configure({
			speed,
			reduced: motion === "system" ? null : motion === "reduced",
		});
	}, [speed, motion]);

	return (
		<section className="demo">
			<div className="controls">
				<label>
					Speed
					<select
						value={speed}
						onChange={(e) => setSpeed(Number(e.target.value))}
					>
						<option value={1}>1×</option>
						<option value={0.5}>0.5×</option>
						<option value={0.25}>0.25×</option>
						<option value={0.1}>0.1×</option>
					</select>
				</label>
				<label>
					Motion
					<select value={motion} onChange={(e) => setMotion(e.target.value)}>
						<option value="system">System</option>
						<option value="full">Full</option>
						<option value="reduced">Reduced</option>
					</select>
				</label>
			</div>
		</section>
	);
}

function EventLog() {
	const [lines, setLines] = useState<string[]>([]);

	useEffect(() => {
		log = (line) => setLines((all) => [...all.slice(-7), line]);
		return () => {
			log = () => {};
		};
	}, []);

	return (
		<section className="demo">
			<h2>Events</h2>
			<pre className="log">{lines.join("\n")}</pre>
		</section>
	);
}

function App() {
	return (
		<main className="wrap">
			<style>{css}</style>
			<h1>emerse playground</h1>
			<Controls />
			<ChatDemo />
			<ScrollDemo />
			<CornersDemo />
			<PressDemo />
			<EventLog />
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
