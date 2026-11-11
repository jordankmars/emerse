"use client";

import { Emerse } from "emerse/react";
import { useState } from "react";

const notes = Array.from({ length: 24 }, (_, i) => `Message number ${i + 1}`);
const items = ["Reply", "Copy", "Pin"];

export function ScrollOrPress() {
	const [picked, setPicked] = useState("Scroll, or hold a message");
	return (
		<div className="grid w-[min(100%,320px)] gap-4">
			<div className="flex h-56 flex-col items-start gap-2 overflow-y-auto rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900">
				{notes.map((note) => (
					<Emerse.Root key={note}>
						<Emerse.Trigger className="cursor-default rounded-[18px] bg-white px-[13px] py-2 text-sm dark:bg-neutral-800">
							{note}
						</Emerse.Trigger>
						<Emerse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
						<Emerse.Menu className="z-62 grid w-[210px] rounded-[14px] bg-white p-[5px] text-sm shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
							{items.map((item) => (
								<Emerse.Item
									key={item}
									onSelect={() => setPicked(`${item}: ${note}`)}
									className="cursor-default rounded-[9px] px-3 py-[9px] text-left hover:bg-neutral-100 data-highlighted:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-highlighted:bg-neutral-800"
								>
									{item}
								</Emerse.Item>
							))}
						</Emerse.Menu>
					</Emerse.Root>
				))}
			</div>
			<p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
				{picked}
			</p>
		</div>
	);
}
