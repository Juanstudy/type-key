/**
 * Monkeyterm — Terminal typing test
 * Powered by Bun + OpenTUI
 */

import { createCliRenderer, Text } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";

const VERSION = "1.0.0";

async function main(): Promise<void> {
	const renderer: CliRenderer = await createCliRenderer({
		exitOnCtrlC: true,
	});

	renderer.root.add(
		Text({
			content: `Monkeyterm v${VERSION} — Press any key to start`,
			fg: "#00FF00",
		}),
	);

	// Keep process alive until user exits
	process.on("SIGINT", () => {
		renderer.destroy();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
