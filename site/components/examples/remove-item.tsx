"use client";

import { Emerse } from "emerse/react";
import { useRef, useState } from "react";

const todos = ["Book the table", "Call the dentist", "Renew passport"];

function Row({ text, remove }: { text: string; remove: () => void }) {
	const deleting = useRef(false);
	return (
		<Emerse.Root onClosed={() => deleting.current && remove()}>
			<Emerse.Trigger className="cursor-default rounded-xl bg-neutral-100 px-4 py-3 text-sm dark:bg-neutral-800">
				{text}
			</Emerse.Trigger>
			<Emerse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
			<Emerse.Menu className="z-62 grid w-40 rounded-[14px] bg-white p-[5px] text-sm shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
				<Emerse.Item
					onSelect={() => {
						deleting.current = true;
					}}
					className="cursor-default rounded-[9px] px-3 py-[9px] text-left text-red-600 hover:bg-neutral-100 data-highlighted:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800 dark:data-highlighted:bg-neutral-800"
				>
					Delete
				</Emerse.Item>
			</Emerse.Menu>
		</Emerse.Root>
	);
}

export function RemoveItem() {
	const [list, setList] = useState(todos);
	return (
		<div className="grid w-full max-w-xs gap-2">
			{list.map((text) => (
				<Row
					key={text}
					text={text}
					remove={() => setList((all) => all.filter((t) => t !== text))}
				/>
			))}
			{list.length < todos.length ? (
				<button
					type="button"
					onClick={() => setList(todos)}
					className="mt-2 justify-self-center text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
				>
					Restore
				</button>
			) : null}
		</div>
	);
}
