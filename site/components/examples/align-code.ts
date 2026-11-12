export type Align = "start" | "end";

export const ALIGNS: Align[] = ["start", "end"];

export const alignCode = (
	align: Align,
) => `import { Repousse } from "repousse/react";

export function Example() {
	return (
		<Repousse.Root>
			<Repousse.Trigger>Hold me</Repousse.Trigger>
			<Repousse.Overlay />
			<Repousse.Menu align="${align}">
				<Repousse.Item>Reply</Repousse.Item>
				<Repousse.Item>Copy</Repousse.Item>
			</Repousse.Menu>
		</Repousse.Root>
	);
}`;
