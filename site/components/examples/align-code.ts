export type Align = "start" | "end";

export const ALIGNS: Align[] = ["start", "end"];

export const alignCode = (
	align: Align,
) => `import { Emerse } from "emerse/react";

export function Example() {
	return (
		<Emerse.Root>
			<Emerse.Trigger>Hold me</Emerse.Trigger>
			<Emerse.Overlay />
			<Emerse.Menu align="${align}">
				<Emerse.Item>Reply</Emerse.Item>
				<Emerse.Item>Copy</Emerse.Item>
			</Emerse.Menu>
		</Emerse.Root>
	);
}`;
