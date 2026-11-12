"use client";

import { Repousse } from "repousse/react";

const ink =
	"bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900";
const items = ["Copy link", "Send by email", "Post to #design"];

export function StyleSite() {
	return (
		<Repousse.Root>
			<Repousse.Trigger
				className={`${ink} grid h-10 cursor-default place-items-center rounded-xl px-4 text-sm font-medium`}
			>
				Q3 roadmap
			</Repousse.Trigger>
			<Repousse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
			<Repousse.Menu
				className={`${ink} z-62 grid w-[250px] rounded-2xl p-1.5 text-sm`}
			>
				{items.map((item) => (
					<Repousse.Item
						key={item}
						className="cursor-default rounded-[9px] px-2.5 py-[9px] text-left hover:bg-neutral-50/12 data-highlighted:bg-neutral-50/12 dark:hover:bg-neutral-900/12 dark:data-highlighted:bg-neutral-900/12"
					>
						{item}
					</Repousse.Item>
				))}
			</Repousse.Menu>
		</Repousse.Root>
	);
}
