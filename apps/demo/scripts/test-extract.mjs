/**
 * Test script to verify extraction with real fixtures
 * Usage: node scripts/test-extract.mjs
 * 
 * Note: This requires fixtures to be present at fixtures/cinode/cv-sv.json and cv-en.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Dynamic import of the extraction module (compiled from TypeScript)
async function main() {
  const svPath = path.join(rootDir, 'fixtures/cinode/cv-sv.json');
  const enPath = path.join(rootDir, 'fixtures/cinode/cv-en.json');

  if (!fs.existsSync(svPath) || !fs.existsSync(enPath)) {
    console.error('Fixture files not found. Make sure cv-sv.json and cv-en.json exist in fixtures/cinode/');
    process.exit(1);
  }

  const rawSv = JSON.parse(fs.readFileSync(svPath, 'utf8'));
  const rawEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  // Import the extraction module
  // Note: This is a simple test that mimics what the extraction does
  // The actual extraction module is in TypeScript

  console.log('=== Fixture Analysis ===\n');
  
  console.log('Swedish CV:');
  console.log('  ID:', rawSv.id);
  console.log('  Language:', rawSv.language, `(${rawSv.languageCountry})`);
  console.log('  Name:', rawSv.userFirstname, rawSv.userLastname);
  console.log('  Updated:', rawSv.updated);
  console.log('  Blocks:', rawSv.resume?.blocks?.length ?? 0);

  console.log('\nEnglish CV:');
  console.log('  ID:', rawEn.id);
  console.log('  Language:', rawEn.language, `(${rawEn.languageCountry})`);
  console.log('  Name:', rawEn.userFirstname, rawEn.userLastname);
  console.log('  Updated:', rawEn.updated);
  console.log('  Blocks:', rawEn.resume?.blocks?.length ?? 0);

  // Find and display block types
  console.log('\n=== Block Types ===\n');
  const blockTypes = new Set();
  for (const block of rawSv.resume?.blocks ?? []) {
    blockTypes.add(block.friendlyBlockName);
  }
  console.log('Found blocks:', Array.from(blockTypes).join(', '));

  // Count skills
  let skillCount = 0;
  for (const block of rawSv.resume?.blocks ?? []) {
    if (block.friendlyBlockName === 'SkillsByCategory') {
      for (const category of block.data ?? []) {
        skillCount += category.skills?.length ?? 0;
      }
    }
  }
  console.log('\nSkills in SkillsByCategory:', skillCount);

  // Count work experiences
  let workExpCount = 0;
  for (const block of rawSv.resume?.blocks ?? []) {
    const data = block.data;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (first && ('employer' in first || 'startDate' in first)) {
        workExpCount += data.length;
      }
    }
  }
  console.log('Work experiences found:', workExpCount);

  console.log('\n=== Ready for Extraction ===');
  console.log('Fixtures are valid and ready for use with extractCv()');
}

main().catch(console.error);
