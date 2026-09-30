import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildStandalone() {
  console.log('🏗️ Building standalone production worker and database migration runner...');

  // Ensure output directories exist
  const distDir = path.join(process.cwd(), 'dist');
  const distWorkerDir = path.join(distDir, 'worker');
  const distDbDir = path.join(distDir, 'db');
  const distMigrationsDir = path.join(distDbDir, 'migrations');

  fs.mkdirSync(distWorkerDir, { recursive: true });
  fs.mkdirSync(distMigrationsDir, { recursive: true });

  // 1. Compile SQS Worker
  console.log('📦 Compiling src/worker/index.ts -> dist/worker/index.js...');
  await build({
    entryPoints: ['src/worker/index.ts'],
    outfile: 'dist/worker/index.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node20',
    sourcemap: true,
  });

  // 2. Compile Migration Runner
  console.log('📦 Compiling src/db/migrate.ts -> dist/db/migrate.js...');
  await build({
    entryPoints: ['src/db/migrate.ts'],
    outfile: 'dist/db/migrate.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node20',
    sourcemap: true,
  });

  // 3. Copy SQL migrations to dist/db/migrations
  const srcMigrationsDir = path.join(process.cwd(), 'src/db/migrations');
  if (fs.existsSync(srcMigrationsDir)) {
    const files = fs.readdirSync(srcMigrationsDir);
    for (const file of files) {
      if (file.endsWith('.sql')) {
        fs.copyFileSync(path.join(srcMigrationsDir, file), path.join(distMigrationsDir, file));
        console.log(`  📄 Copied migration: ${file}`);
      }
    }
  }

  console.log('✅ Standalone production artifacts built successfully in ./dist');
}

buildStandalone().catch((err) => {
  console.error('❌ Build standalone failed:', err);
  process.exit(1);
});
