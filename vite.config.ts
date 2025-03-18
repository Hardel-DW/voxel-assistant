import { defineConfig } from "vite";

export default defineConfig({
	build: {
		ssr: true,
		rollupOptions: {
			input: "src/server.ts",
			output: {
				format: "es",
				entryFileNames: "worker.js",
			},
		},
		minify: false,
	},
});
