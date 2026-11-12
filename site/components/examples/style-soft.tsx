"use client";

import { Repousse } from "repousse/react";

const items = ["Copy link", "Send by email", "Post to #design"];

export function StyleSoft() {
	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-indigo-50" />
			<Repousse.Root>
				<Repousse.Trigger className="relative grid h-11 cursor-default place-items-center rounded-full bg-white px-6 text-sm font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
					Q3 roadmap
				</Repousse.Trigger>
				<Repousse.Overlay className="z-60 bg-indigo-50/60 backdrop-blur-xl" />
				<Repousse.Menu className="z-62 grid w-64 rounded-[28px] bg-white p-3 text-sm text-slate-700 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
					{items.map((item) => (
						<Repousse.Item
							key={item}
							className="cursor-default rounded-2xl px-4 py-3 text-left hover:bg-indigo-50 data-highlighted:bg-indigo-50"
						>
							{item}
						</Repousse.Item>
					))}
				</Repousse.Menu>
			</Repousse.Root>
		</>
	);
}
