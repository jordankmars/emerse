"use client";

import { Repousse } from "repousse/react";

const line = "border border-green-500/60 bg-black font-mono text-green-400";
const items = ["copy-link", "send --email", "post #design"];

export function StyleTerminal() {
	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-black" />
			<Repousse.Root>
				<Repousse.Trigger
					className={`${line} relative grid h-9 cursor-default place-items-center px-4 text-[13px]`}
				>
					$ q3-roadmap
				</Repousse.Trigger>
				<Repousse.Overlay className="z-60 bg-black/70 backdrop-blur-none" />
				<Repousse.Menu className={`${line} z-62 grid w-64 p-2 text-[13px]`}>
					{items.map((item) => (
						<Repousse.Item
							key={item}
							className="cursor-default px-1 py-1 text-left hover:bg-green-400 hover:text-black data-highlighted:bg-green-400 data-highlighted:text-black"
						>
							&gt; {item}
						</Repousse.Item>
					))}
				</Repousse.Menu>
			</Repousse.Root>
		</>
	);
}
