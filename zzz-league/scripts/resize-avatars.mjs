// Pre-generates properly downscaled avatar thumbnails so the browser never has to squeeze a
// large source image into a tiny <img> box at runtime (which is where the mushy antialiasing on
// the costs-page/leaderboard avatars was coming from). Run after adding/changing any source image
// in src/lib/assets/agents or src/lib/assets/weapons:
//
//   npm run resize-avatars
//
// Source files (the flat *.webp files directly under agents/ and weapons/) are left untouched as
// masters — only the sm/ and lg/ subfolders are (re)written, so this is safe to re-run anytime.
import { readdir, mkdir } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const AGENTS_DIR = new URL("../src/lib/assets/agents/", import.meta.url);
const WEAPONS_DIR = new URL("../src/lib/assets/weapons/", import.meta.url);

// Widths chosen from the largest real on-screen usage of each tier, doubled for retina:
//   agents "sm" (~96px)  covers every ≤52px usage: Leaderboard (26px), SidePanel (42px),
//     AvatarPickerPopup (52px), cost/weapon table avatars (26-36px), bracket match avatars (28px).
//   agents "lg" (~192px) covers the two full-size avatar usages: SettingsPopup preview (76px)
//     and PlayerProfilePopup (88px).
//   weapons "sm" (~80px) covers their one usage everywhere (26-36px) — weapons have no large view.
const AGENT_SIZES = { sm: 96, lg: 192 };
const WEAPON_SIZES = { sm: 80 };

async function resizeDir(sourceDir, sizes) {
	const entries = await readdir(sourceDir, { withFileTypes: true });
	const sourceFiles = entries.filter((e) => e.isFile() && extname(e.name) === ".webp");

	for (const [tier, width] of Object.entries(sizes)) {
		const outDir = new URL(`${tier}/`, sourceDir);
		await mkdir(outDir, { recursive: true });

		await Promise.all(
			sourceFiles.map(async (entry) => {
				const input = fileURLToPath(new URL(entry.name, sourceDir));
				const output = fileURLToPath(new URL(entry.name, outDir));
				await sharp(input)
					.resize({ width, kernel: sharp.kernel.lanczos3 })
					.webp({ quality: 85 })
					.toFile(output);
			}),
		);

		console.log(`  ${tier}/ (${width}px): ${sourceFiles.length} files -> ${fileURLToPath(outDir)}`);
	}

	return sourceFiles.length;
}

console.log("Resizing agent avatars...");
const agentCount = await resizeDir(AGENTS_DIR, AGENT_SIZES);

console.log("Resizing weapon avatars...");
const weaponCount = await resizeDir(WEAPONS_DIR, WEAPON_SIZES);

console.log(`Done: ${agentCount} agents, ${weaponCount} weapons.`);
