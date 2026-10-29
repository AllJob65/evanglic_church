import { execFileSync } from 'node:child_process';

const baseRef = process.env.GITHUB_BASE_REF;
if (!baseRef) {
  console.log('Runtime artifact guard: pull-request base ref is unavailable; skipping.');
  process.exit(0);
}

let changedFiles;
try {
  execFileSync('git', ['fetch', '--no-tags', 'origin', baseRef], { stdio: 'inherit' });
  changedFiles = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMRT', `origin/${baseRef}...HEAD`],
    { encoding: 'utf8' }
  ).split('\n').filter(Boolean);
} catch (error) {
  console.error('Runtime artifact guard could not inspect the pull-request diff.');
  console.error('Failing closed: ensure the base branch is fetchable and Git history is available.');
  process.exit(1);
}

const violations = changedFiles.filter((file) => {
  const normalized = file.replaceAll('\\', '/');
  const name = normalized.split('/').pop() || '';
  return (
    normalized === 'cmms_db.json' ||
    normalized.startsWith('backups/') ||
    /\.(sqlite|sqlite3|db)$/i.test(name) ||
    /^\.env(?:\..+)?$/i.test(name) && name.toLowerCase() !== '.env.example'
  );
});

if (violations.length) {
  console.error('Runtime data or environment-secret artifacts must not be added or modified in pull requests:');
  for (const file of violations) console.error(` - ${file}`);
  process.exit(1);
}

console.log(`Runtime artifact guard passed (${changedFiles.length} changed paths checked).`);
