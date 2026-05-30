import { createCliRenderer } from "@opentui/core";
import {
	handleKey,
	handleQuit,
	goMenu,
	initDB,
	setRenderer,
} from "./lib/state";

interface KeyEvent {
	name?: string;
	ctrl?: boolean;
}

async function main(): Promise<void> {
	const renderer = await createCliRenderer({ exitOnCtrlC: false });
	setRenderer(renderer);

	// Center content via flexbox on root
	renderer.root.justifyContent = "center";
	renderer.root.alignItems = "center";

	// Key handler: renderer.keyInput is an EventEmitter.
	// as unknown as { on: ... } is safe because keyInput is always present
	// on CliRenderer and its constructor guarantees it extends EventEmitter.
	(
		renderer.keyInput as unknown as {
			on(event: string, handler: (key: KeyEvent) => void): void;
		}
	).on("keypress", (key) => handleKey(key));

	process.on("SIGINT", handleQuit);

	initDB();
	goMenu();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
