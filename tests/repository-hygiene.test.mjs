import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const repositoryRoot = new URL('../', import.meta.url);

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function getTrackedFiles() {
  const output = runGit(['ls-files']);
  return output ? output.split(/\r?\n/) : [];
}

test('local environment files are not tracked', () => {
  const trackedEnvironmentFiles = getTrackedFiles().filter((file) => {
    const name = file.split('/').at(-1)?.toLowerCase();

    return (
      name === '.env' ||
      (name?.startsWith('.env.') === true && name !== '.env.example')
    );
  });

  assert.deepEqual(
    trackedEnvironmentFiles,
    [],
    `Environment files must not be tracked: ${trackedEnvironmentFiles.join(', ')}`
  );
});

test('local database files are not tracked', () => {
  const databasePattern =
    /\.(?:db|sqlite|sqlite3)(?:-journal|-shm|-wal)?$/i;
  const trackedDatabases = getTrackedFiles().filter((file) =>
    databasePattern.test(file)
  );

  assert.deepEqual(
    trackedDatabases,
    [],
    `Database files must not be tracked: ${trackedDatabases.join(', ')}`
  );
});

test('representative local artifacts are covered by ignore rules', () => {
  const ignoredArtifacts = [
    'backend/.env',
    'backend/.env.beta',
    'backend/dev.db',
    'backend/dev.db-journal',
    'backend/local.sqlite',
    'backend/local.sqlite3',
  ];

  for (const artifact of ignoredArtifacts) {
    assert.doesNotThrow(
      () => runGit(['check-ignore', '--quiet', '--no-index', artifact]),
      `${artifact} must be ignored`
    );
  }
});
