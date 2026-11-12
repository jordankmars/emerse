"use client";

import { Repousse } from "repousse/react";

const glass =
	"border border-white/30 bg-white/20 text-white backdrop-blur-xl backdrop-saturate-150";
const items = ["Copy link", "Send by email", "Post to #design"];

export function StyleGlass() {
	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-linear-to-br from-fuchsia-500 via-violet-500 to-sky-400" />
			<Repousse.Root>
				<Repousse.Trigger
					className={`${glass} relative grid h-10 cursor-default place-items-center rounded-full px-5 text-sm font-medium`}
				>
					Q3 roadmap
				</Repousse.Trigger>
				<Repousse.Overlay className="z-60 bg-transparent backdrop-blur-[3px]" />
				<Repousse.Menu
					className={`${glass} z-62 grid w-60 rounded-3xl p-2 text-sm shadow-xl shadow-black/20`}
				>
					{items.map((item) => (
						<Repousse.Item
							key={item}
							className="cursor-default rounded-2xl px-3 py-2 text-left hover:bg-white/20 data-highlighted:bg-white/20"
						>
							{item}
						</Repousse.Item>
					))}
				</Repousse.Menu>
			</Repousse.Root>
		</>
	);
}
