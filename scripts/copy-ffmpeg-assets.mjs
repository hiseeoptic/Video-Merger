import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const sourceDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
const outputDir = join(root, "public", "ffmpeg");
const assets = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

await mkdir(outputDir, { recursive: true });
await Promise.all(assets.map((asset) => copyFile(join(sourceDir, asset), join(outputDir, asset))));

console.log(`FFmpeg assets ready in ${outputDir}`);
