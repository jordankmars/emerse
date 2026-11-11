"use client";

import { Emerse } from "emerse/react";
import { useState } from "react";
import { ExampleTabs } from "../example-tabs";
import { ALIGNS, type Align } from "./align-code";

const items = ["Reply", "Copy", "Pin"];

export function AlignPicker({
	variants,
}: {
	variants: Record<Align, { html: string; code: string }>;
}) {
	const [align, setAlign] = useState<Align>("start");

	const view = (
		<>
			<Emerse.Root>
				<Emerse.Trigger className="grid h-9 w-44 cursor-default place-items-center rounded-lg bg-neutral-900 text-sm font-medium text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900">
					Hold me
				</Emerse.Trigger>
				<Emerse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
				<Emerse.Menu
					align={align}
					className="z-62 grid w-32 rounded-[14px] bg-white p-[5px] text-sm shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
				>
					{items.map((item) => (
						<Emerse.Item
							key={item}
							className="cursor-default rounded-[9px] px-3 py-[9px] text-left hover:bg-neutral-100 data-highlighted:bg-neutral-100 dark:hover:bg-neutral-800 dark:data-highlighted:bg-neutral-800"
						>
							{item}
						</Emerse.Item>
					))}
				</Emerse.Menu>
			</Emerse.Root>
			<fieldset className="absolute bottom-4 left-4 flex w-fit gap-3">
				<legend className="sr-only">Align</legend>
				{ALIGNS.map((value) => (
					<label key={value} className="block cursor-pointer">
						<input
							type="radio"
							name="align"
							value={value}
							checked={align === value}
							onChange={() => setAlign(value)}
							className="peer sr-only"
						/>
						<span className="block rounded border border-neutral-300 px-2 py-0.5 font-mono text-xs peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-neutral-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-neutral-400 dark:border-neutral-700 dark:peer-checked:border-neutral-100 dark:peer-checked:bg-neutral-100 dark:peer-checked:text-neutral-900">
							{value}
						</span>
					</label>
				))}
			</fieldset>
		</>
	);

	return <ExampleTabs view={view} {...variants[align]} />;
}
