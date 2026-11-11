import { highlight } from "@/lib/highlight";
import { ALIGNS, type Align, alignCode } from "./examples/align-code";
import { AlignPicker } from "./examples/align-picker";

/** Highlights every variant at build time, so the picker can swap between them. */
export async function AlignExample() {
	const entries = await Promise.all(
		ALIGNS.map(async (align) => {
			const code = alignCode(align);
			return [align, { html: await highlight(code), code }] as const;
		}),
	);
	return (
		<AlignPicker
			variants={
				Object.fromEntries(entries) as Record<
					Align,
					{ html: string; code: string }
				>
			}
		/>
	);
}
