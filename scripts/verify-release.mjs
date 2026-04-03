import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const commands = [
  ['npm', ['run', 'ci']],
  ['npm', ['run', 'build']],
];

for (const [command, args] of commands) {
  console.log(`\n==> ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const requiredArtifacts = [
  '.next/BUILD_ID',
  '.next/build-manifest.json',
  '.next/routes-manifest.json',
  '.next/server/app-paths-manifest.json',
  '.next/server/server-reference-manifest.json',
];

for (const artifact of requiredArtifacts) {
  const artifactPath = path.join(repoRoot, artifact);

  if (!existsSync(artifactPath)) {
    console.error(`Missing release artifact: ${artifact}`);
    process.exit(1);
  }
}

console.log('\nRelease verification passed.');
