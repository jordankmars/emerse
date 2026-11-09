import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "src/react/index.ts",
	root: "src",
	format: "esm",
	// A server component can't dot into a client module, so the Emerse namespace
	// has to live outside the boundary. The directive goes on each component and
	// nothing is bundled, or the namespace would end up inside a client file.
	unbundle: true,
	banner: ({ fileName }) =>
		/react\/(root|trigger|menu|item|overlay)\.mjs$/.test(fileName)
			? { js: '"use client";' }
			: undefined,
	dts: true,
	clean: true,
	publint: true,
	attw: { profile: "esm-only", level: "error" },
});
