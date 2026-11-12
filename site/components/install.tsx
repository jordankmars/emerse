import { highlight } from "@/lib/highlight";
import { InstallTabs } from "./install-tabs";

const COMMANDS = [
	["pnpm", "pnpm add repousse"],
	["npm", "npm install repousse"],
	["yarn", "yarn add repousse"],
	["bun", "bun add repousse"],
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
