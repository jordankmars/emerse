"use client";

import { Emerse } from "emerse/react";
import { useState } from "react";

// A port of the playground's "Peek menu" (playground/main.tsx), with the same
// sizes, items and messages, in the site's neutral palette. Messages from "me"
// use the same ink as the primary button. The overlay and the lifted copy are
// styled in globals.css, since emerse renders them itself.
const ITEMS = [
	["Reply", "↩"],
	["Copy", "⌘C"],
	["Pin", "P"],
	["Forward", "→"],
] as const;

const STATUS: Record<string, string> = {
	Reply: "Replying",
	Copy: "Copied to clipboard",
	Pin: "Pinned to the top",
	Forward: "Pick someone to forward to",
};

const ink =
	"bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900";
const focus =
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400";

function Bubble({
	text,
	me = false,
	onPick,
}: {
	text: string;
	me?: boolean;
	onPick: (label: string) => void;
}) {
	return (
		<Emerse.Root>
			<Emerse.Trigger asChild>
				<button
					type="button"
					className={`${me ? `${ink} self-end` : "self-start bg-white dark:bg-neutral-800"} ${focus} max-w-[78%] cursor-default rounded-[18px] px-[13px] py-2 text-left`}
				>
					{text}
				</button>
			</Emerse.Trigger>
			<Emerse.Overlay />
			<Emerse.Menu
				align={me ? "end" : "start"}
				className="z-62 grid w-[210px] rounded-[14px] bg-white p-[5px] text-[14px]/[1.5] text-neutral-900 shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800"
			>
				{ITEMS.map(([label, hint]) => (
					<Emerse.Item
						key={label}
						onSelect={() => onPick(label)}
						className={`${focus} flex cursor-default items-center justify-between rounded-[9px] px-3 py-[9px] text-left hover:bg-neutral-100 data-highlighted:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-highlighted:bg-neutral-800`}
					>
						{label}
						<span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
							{hint}
						</span>
					</Emerse.Item>
				))}
			</Emerse.Menu>
		</Emerse.Root>
	);
}

export function PeekMenuSample() {
	const [status, setStatus] = useState("Hold for half a second");
	const onPick = (label: string) => setStatus(STATUS[label] ?? label);

	return (
		<div className="grid min-h-60 justify-items-center content-center gap-3 rounded-[10px] bg-neutral-100 p-4 text-[14px]/[1.5] dark:bg-neutral-900">
			<div className="flex w-[min(100%,320px)] flex-col gap-2">
				<Bubble text="Are we still on for dinner?" onPick={onPick} />
				<Bubble text="Yes! See you at 7?" me onPick={onPick} />
				<Bubble
					text="Perfect. I'll book the table by the window."
					onPick={onPick}
				/>
			</div>
			<p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
				{status}
			</p>
		</div>
	);
}
