import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev playground for poking at the core while it's built. Not part of the package.
export default defineConfig({
	plugins: [react()],
});
