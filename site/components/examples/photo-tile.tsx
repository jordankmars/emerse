"use client";

import { Emerse } from "emerse/react";
import { useState } from "react";

const photos = [
	{
		title: "Low tide",
		art: "linear-gradient(160deg,#0f4c5c,#5fa8a0 55%,#e3d9b8)",
	},
	{
		title: "Ember",
		art: "linear-gradient(150deg,#3b0d11,#c2410c 50%,#fbbf24)",
	},
	{
		title: "Glasshouse",
		art: "linear-gradient(170deg,#14351f,#4d7c46 50%,#d9e8a8)",
	},
];
const items = ["Save", "Share", "Delete"];

export function PhotoTile() {
	const [picked, setPicked] = useState("Hold a photo");
	return (
		<div className="grid w-full max-w-md gap-4">
			<div className="grid grid-cols-3 gap-3">
				{photos.map((photo) => (
					<Emerse.Root key={photo.title}>
						<Emerse.Trigger
							aria-label={photo.title}
							className="aspect-square cursor-default rounded-xl"
							style={{ background: photo.art }}
						/>
						<Emerse.Overlay className="z-60 bg-white/45 backdrop-blur-[10px] dark:bg-neutral-950/50" />
						<Emerse.Menu className="z-62 grid w-44 rounded-[14px] bg-white p-[5px] text-sm shadow-[0_12px_40px_rgb(0_0_0/0.2)] ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
							{items.map((item) => (
								<Emerse.Item
									key={item}
									onSelect={() => setPicked(`${item}: ${photo.title}`)}
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
