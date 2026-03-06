import { cpSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "dist-firefox");

// Copy the entire dist folder
mkdirSync(outDir, { recursive: true });
cpSync(join(root, "dist"), join(outDir, "dist"), { recursive: true });
cpSync(join(root, "icons"), join(outDir, "icons"), { recursive: true });

// Use the Firefox manifest
copyFileSync(join(root, "manifest.firefox.json"), join(outDir, "manifest.json"));

console.log("Firefox extension built to dist-firefox/");
