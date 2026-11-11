import { highlight } from "@/lib/highlight";
import { InstallTabs } from "./install-tabs";

const COMMANDS = [
	["pnpm", "pnpm add emerse"],
	["npm", "npm install emerse"],
	["yarn", "yarn add emerse"],
	["bun", "bun add emerse"],
] as const;

export async function Install() {
	const commands = await Promise.all(
		COMMANDS.map(async ([manager, code]) => ({
			manager,
			code,
			html: await highlight(code, "sh"),
		})),
	);
	return <InstallTabs commands={commands} />;
}
