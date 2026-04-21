/**
 * Copies brand-owned theme CSS files into the app's public/themes/cv/ directory.
 *
 * Source: brands/<name>/themes/*.css
 * Dest:   apps/demo/public/themes/cv/<filename>.css
 *
 * Run automatically before dev/build via package.json predev/prebuild scripts.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// scripts/ is inside apps/demo, so monorepo root is three levels up
const repoRoot = path.resolve(__dirname, '../../..');
const brandsDir = path.join(repoRoot, 'brands');
const destDir = path.join(__dirname, '..', 'public', 'themes', 'cv');

async function main() {
  await fs.mkdir(destDir, { recursive: true });

  let brandEntries;
  try {
    brandEntries = await fs.readdir(brandsDir, { withFileTypes: true });
  } catch {
    console.log('No brands/ directory found — skipping theme copy.');
    return;
  }

  let copied = 0;
  for (const brandEntry of brandEntries) {
    if (!brandEntry.isDirectory()) continue;
    const themesDir = path.join(brandsDir, brandEntry.name, 'themes');
    let themeFiles;
    try {
      themeFiles = await fs.readdir(themesDir, { withFileTypes: true });
    } catch {
      continue; // brand has no themes/ dir
    }
    for (const file of themeFiles) {
      if (!file.isFile() || !file.name.toLowerCase().endsWith('.css')) continue;
      const src = path.join(themesDir, file.name);
      const dest = path.join(destDir, file.name);
      await fs.copyFile(src, dest);
      console.log(`  copied ${brandEntry.name}/themes/${file.name} → public/themes/cv/${file.name}`);
      copied++;
    }
  }

  console.log(`copy-brand-themes: ${copied} file(s) copied.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
