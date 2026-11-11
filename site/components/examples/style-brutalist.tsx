"use client";

import { Emerse } from "emerse/react";

const items = ["Copy link", "Send by email", "Post to #design"];

// A plain copy keeps the trigger's classes, and so its hard shadow.
const keepClasses = (trigger: HTMLElement) =>
	trigger.cloneNode(true) as HTMLElement;

export function StyleBrutalist() {
	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-amber-100" />
			<Emerse.Root>
				<Emerse.Trigger
					clone={keepClasses}
					className="relative grid h-11 cursor-default place-items-center border-[3px] border-black bg-yellow-300 px-5 text-sm font-black text-black uppercase shadow-[4px_4px_0_#000]"
				>
					Q3 roadmap
				</Emerse.Trigger>
				<Emerse.Overlay className="z-60 bg-black/40 backdrop-blur-none" />
				<Emerse.Menu className="z-62 grid w-64 gap-1 border-[3px] border-black bg-white p-2 text-sm font-bold text-black shadow-[8px_8px_0_#000]">
					{items.map((item) => (
						<Emerse.Item
							key={item}
							className="cursor-default border-2 border-transparent px-2 py-1.5 text-left hover:border-black hover:bg-cyan-300 data-highlighted:border-black data-highlighted:bg-cyan-300"
						>
							{item}
						</Emerse.Item>
					))}
				</Emerse.Menu>
			</Emerse.Root>
		</>
	);
}
