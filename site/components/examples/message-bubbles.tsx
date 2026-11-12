"use client";

import { useState } from "react";
import { Repousse } from "repousse/react";

const items = ["Reply", "Copy", "Pin", "Forward"];

const ink =
	"bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900";
const other = "bg-neutral-100 dark:bg-neutral-800";

function Bubble({
	text,
	me = false,
	onPick,
}: {
	text: string;
	me?: boolean;
	onPick: (item: string) => void;
}) {
	return (
		<Repousse.Root>
			<Repousse.Trigger asChild>
				<button
					type="button"
					className={`${me ? `${ink} self-end` : `${other} self-start`} max-w-[78%] cursor-default rounded-[18px] px-[13px] py-2 text-left text-sm`}
				>
					{text}
				</button>
			</Repousse.Trigger>
			<Repousse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
			<Repousse.Menu
				align={me ? "end" : "start"}
				className="z-62 grid w-[210px] rounded-[14px] bg-white p-[5px] text-sm shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
			>
				{items.map((item) => (
					<Repousse.Item
						key={item}
						onSelect={() => onPick(item)}
						className="cursor-default rounded-[9px] px-3 py-[9px] text-left hover:bg-neutral-100 data-highlighted:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-highlighted:bg-neutral-800"
					>
						{item}
					</Repousse.Item>
				))}
			</Repousse.Menu>
		</Repousse.Root>
	);
}

export function MessageBubbles() {
	const [picked, setPicked] = useState("Hold a message");
	return (
		<div className="grid w-[min(100%,320px)] gap-4">
			<div className="flex flex-col gap-2">
				<Bubble text="Are we still on for dinner?" onPick={setPicked} />
				<Bubble text="Yes! See you at 7?" me onPick={setPicked} />
				<Bubble
					text="Perfect. I'll book the table by the window."
					onPick={setPicked}
				/>
			</div>
			<p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
				{picked}
			</p>
		</div>
	);
}
