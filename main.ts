// Sizzle Street — Rush Hour Kitchen: make.fun entry program (program/v1).
// Copies the static game and its screenshots into the output directory and
// writes the dossier the judge reads, built with the kit's own library so the
// bytes match the gate's rebuild exactly.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier's source text is capped at 160 KiB by the bounty rules.
const DOSSIER_TEXT_MAX_BYTES = 163_840;

function handIn(): void {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outputDir, { text_max_bytes: DOSSIER_TEXT_MAX_BYTES });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`handed in: game + screenshots + dossier.json (${dossier.length} bytes) -> ${outputDir}`);
}

handIn();
