#!/usr/bin/env node
/**
 * Generate favicon assets from `public/favicon.svg`.
 *
 * Produces:
 *  - public/favicon.ico            (multi-size ICO: 16, 32, 48 px PNG-encoded)
 *  - public/favicon-16x16.png      (16×16)
 *  - public/favicon-32x32.png      (32×32)
 *  - public/apple-touch-icon.png   (180×180)
 *
 * Run with: `node scripts/generate-favicons.mjs`
 *
 * Yandex Webmaster's «favicon not found» check is strict about the
 * `.ico` file format being a real ICO container (not a PNG renamed
 * with an .ico extension). PNG-payload ICO is supported by all modern
 * browsers, search-engine crawlers and Yandex.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');

const SVG_PATH = resolve(PUBLIC_DIR, 'favicon.svg');

const ICO_SIZES = [16, 32, 48];
const STANDALONE_PNGS = [
	{ size: 16, file: 'favicon-16x16.png' },
	{ size: 32, file: 'favicon-32x32.png' },
	{ size: 180, file: 'apple-touch-icon.png' },
];

/**
 * Pack PNG buffers into a multi-image ICO container.
 * ICO format: ICONDIR (6 bytes) + N × ICONDIRENTRY (16 bytes) + N × PNG payloads.
 *
 * @param {{ width: number, height: number, png: Buffer }[]} entries
 * @returns {Buffer}
 */
function buildIco(entries) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0); // reserved
	header.writeUInt16LE(1, 2); // type: 1 = ICO
	header.writeUInt16LE(entries.length, 4); // image count

	const directories = [];
	let imageOffset = 6 + entries.length * 16; // header + N directory entries

	for (const entry of entries) {
		const dir = Buffer.alloc(16);
		// Width / height: 0 means 256.
		dir.writeUInt8(entry.width >= 256 ? 0 : entry.width, 0);
		dir.writeUInt8(entry.height >= 256 ? 0 : entry.height, 1);
		dir.writeUInt8(0, 2); // colour palette size (0 = no palette)
		dir.writeUInt8(0, 3); // reserved
		dir.writeUInt16LE(1, 4); // colour planes
		dir.writeUInt16LE(32, 6); // bits per pixel
		dir.writeUInt32LE(entry.png.length, 8); // bytes in resource
		dir.writeUInt32LE(imageOffset, 12); // offset
		directories.push(dir);
		imageOffset += entry.png.length;
	}

	return Buffer.concat([header, ...directories, ...entries.map((entry) => entry.png)]);
}

async function main() {
	const svg = readFileSync(SVG_PATH);

	for (const { size, file } of STANDALONE_PNGS) {
		const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
		writeFileSync(resolve(PUBLIC_DIR, file), png);
		console.log(`[favicon] wrote public/${file} (${size}×${size}, ${png.length} bytes)`);
	}

	const icoEntries = [];
	for (const size of ICO_SIZES) {
		const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
		icoEntries.push({ width: size, height: size, png });
	}
	const icoBuffer = buildIco(icoEntries);
	writeFileSync(resolve(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
	console.log(
		`[favicon] wrote public/favicon.ico (sizes: ${ICO_SIZES.join(',')}; ${icoBuffer.length} bytes)`,
	);
}

main().catch((err) => {
	console.error('[favicon] generation failed:', err);
	process.exit(1);
});
