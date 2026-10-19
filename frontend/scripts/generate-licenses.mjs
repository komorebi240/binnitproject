// Writes public/third-party-licenses.txt: every package of the web app's production dependencies (at every level), with
// its version, licence and licence text - the notices the MIT, Apache and similar licences ask to ship along with the
// code. The "Open-source licences" page links to it. Runs before `next dev` and `next build`; the file is not committed.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = path.join(root, "public", "third-party-licenses.txt");
const LICENSE_FILE = /^(licen[cs]e|copying|notice)([.\-_].*)?$/i;

const MIT_TERMS = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

// Packages published without their licence text (taken from the project's repository).
const TEXT_NOT_IN_PACKAGE = {
  "@excalidraw/excalidraw": `MIT License\n\nCopyright (c) 2020 Excalidraw\n\n${MIT_TERMS}`,
};

/** Where Node would load `name` from when required inside `fromDir`. */
function resolvePackage(name, fromDir) {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name, "package.json");
    if (existsSync(candidate)) return path.dirname(candidate);
    if (path.dirname(dir) === dir) return null;
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function licenseText(dir, manifest) {
  const file = readdirSync(dir).find((entry) => LICENSE_FILE.test(entry));
  if (file) return readFileSync(path.join(dir, file), "utf8").trim();
  if (TEXT_NOT_IN_PACKAGE[manifest.name]) return TEXT_NOT_IN_PACKAGE[manifest.name];
  // Many small packages declare MIT without shipping the text; the terms are the same for all of them.
  if (manifest.license === "MIT") return `MIT License

Copyright (c) the ${manifest.name} authors

${MIT_TERMS}`;
  return "(The package contains no licence file; see its source repository for the full terms.)";
}

function repositoryOf(manifest) {
  const repository = typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;
  return (repository ?? manifest.homepage ?? "").replace(/^git\+/, "").replace(/\.git$/, "");
}

const app = readJson(path.join(root, "package.json"));
const seen = new Map();
const queue = Object.keys(app.dependencies ?? {}).map((name) => [name, root]);

while (queue.length > 0) {
  const [name, fromDir] = queue.shift();
  const dir = resolvePackage(name, fromDir);
  if (!dir || seen.has(dir)) continue;
  const manifest = readJson(path.join(dir, "package.json"));
  seen.set(dir, manifest);
  for (const dependency of Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies })) {
    queue.push([dependency, dir]);
  }
}

// The same version installed in several folders is listed once.
const unique = new Map();
for (const [dir, manifest] of seen) unique.set(`${manifest.name}@${manifest.version}`, [dir, manifest]);
const entries = [...unique.values()].sort(([, a], [, b]) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const separator = "=".repeat(80);
const body = entries
  .map(([dir, manifest]) =>
    [
      separator,
      `${manifest.name} ${manifest.version}`,
      `License: ${typeof manifest.license === "string" ? manifest.license : (manifest.license?.type ?? "see below")}`,
      repositoryOf(manifest) ? `Source: ${repositoryOf(manifest)}` : null,
      "",
      licenseText(dir, manifest),
      "",
    ]
      .filter((line) => line !== null)
      .join("\n"),
  )
  .join("\n");

writeFileSync(
  target,
  `Orbit - third-party software notices\n\nThe Orbit web app includes the following ${entries.length} open-source packages.\n\n${body}`,
);
