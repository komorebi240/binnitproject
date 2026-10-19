// Excalidraw (the whiteboard) loads its fonts at runtime from window.EXCALIDRAW_ASSET_PATH and falls back to a public
// CDN. Copying them into public/ serves them from this app instead, so opening a whiteboard never contacts a third party
// and works offline. Runs before `next dev` and `next build` (package.json); the copy is not committed.
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = `${root}node_modules/@excalidraw/excalidraw/dist/prod/fonts`;
const target = `${root}public/excalidraw-assets/fonts`;

if (!existsSync(source)) {
  console.error(`Excalidraw fonts not found at ${source} - run npm install first.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
