"use client";

import Link from "next/link";
import { Repousse } from "repousse/react";

const pages = [
	{
		title: "Getting Started",
		text: "Install it and make a menu",
		href: "/docs",
	},
	{ title: "API", text: "The parts and their props", href: "/docs/api" },
	{ title: "Styling", text: "One menu in five looks", href: "/docs/styling" },
];

const item =
	"cursor-default rounded-[9px] px-3 py-[9px] text-left hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent data-highlighted:bg-neutral-100 dark:hover:bg-neutral-800 dark:disabled:hover:bg-transparent dark:data-highlighted:bg-neutral-800";

export function LinkRows() {
	return (
		<div className="grid w-full max-w-sm divide-y divide-neutral-200 dark:divide-neutral-800">
			{pages.map((page) => (
				<Repousse.Root key={page.href}>
					<Repousse.Trigger className="cursor-default bg-white px-2 py-3 dark:bg-neutral-950">
						<b className="block text-sm font-medium">{page.title}</b>
						<span className="text-xs text-neutral-500 dark:text-neutral-400">
							{page.text}
						</span>
					</Repousse.Trigger>
					<Repousse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
					<Repousse.Menu className="z-62 grid w-48 rounded-[14px] bg-white p-[5px] text-sm shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
						<Repousse.Item asChild className={item}>
							<Link href={page.href}>Open</Link>
						</Repousse.Item>
						<Repousse.Item asChild className={item}>
							<a href={page.href} target="_blank" rel="noopener noreferrer">
								Open in new tab
							</a>
						</Repousse.Item>
						<Repousse.Item disabled className={item}>
							Rename
						</Repousse.Item>
					</Repousse.Menu>
				</Repousse.Root>
			))}
		</div>
	);
}
