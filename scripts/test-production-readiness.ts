import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { callAiModelForFormSchema } from '../src/lib/ai/provider';
import { validateStorageConfig } from '../src/lib/s3';
import { validateMigrationPasswords } from '../src/db/migrate';
import { GET as getLiveHealth } from '../src/app/api/health/live/route';

async function runProductionReadinessTests() {
  console.log('🧪 Starting FormFlow Phase 1.2 Production Readiness Test Suite...\n');
  let failures = 0;
  let passes = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passes++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failures++;
    }
  }

  // Preserve original environment
  const originalEnv = { ...process.env };

  try {
    // ------------------------------------------------------------------------
    // Test 1: Production AI without provider key fails
    // ------------------------------------------------------------------------
    console.log('--- 1. Production AI Fallback Validation ---');
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.MOCK_AI;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;

    let aiFailedAsExpected = false;
    try {
      await callAiModelForFormSchema('Create a simple contact form');
    } catch (err: any) {
      aiFailedAsExpected = err.message.includes('AI service configuration error') ||
                           err.message.includes('No AI provider credentials');
    }
    assert(
      aiFailedAsExpected,
      'Production AI without provider key fails clearly',
      'Expected configuration error when running in production without keys',
    );

    // ------------------------------------------------------------------------
    // Test 2: MOCK_AI works in development/test
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Deterministic AI Mock in Dev / Test Mode ---');
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.MOCK_AI = 'true';

    let mockSchemaResult = null;
    try {
      mockSchemaResult = await callAiModelForFormSchema('Create student registration form');
    } catch (err: any) {
      console.error('Unexpected mock error:', err);
    }
    assert(
      Boolean(mockSchemaResult && Array.isArray(mockSchemaResult.fields) && mockSchemaResult.fields.length > 0),
      'MOCK_AI works in development/test without external API calls',
      `Fields generated: ${mockSchemaResult?.fields?.length ?? 0}`,
    );

    // ------------------------------------------------------------------------
    // Test 3: Invalid production storage configuration fails
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Production Storage Validation ---');
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    // 3a. STORAGE_DRIVER=local in production must throw
    process.env.STORAGE_DRIVER = 'local';
    let localInProdFailed = false;
    try {
      validateStorageConfig();
    } catch (err: any) {
      localInProdFailed = err.message.includes('STORAGE_DRIVER cannot be set to "local" in production');
    }
    assert(localInProdFailed, 'STORAGE_DRIVER=local fails in production');

    // 3b. Missing S3 bucket in production must throw
    process.env.STORAGE_DRIVER = 's3';
    delete process.env.SUBMISSIONS_BUCKET_NAME;
    let missingBucketFailed = false;
    try {
      validateStorageConfig();
    } catch (err: any) {
      missingBucketFailed = err.message.includes('SUBMISSIONS_BUCKET_NAME is required in production');
    }
    assert(missingBucketFailed, 'Missing SUBMISSIONS_BUCKET_NAME fails in production');

    // 3c. Valid S3 configuration succeeds
    process.env.SUBMISSIONS_BUCKET_NAME = 'my-production-bucket';
    let validS3Passed = false;
    try {
      const config = validateStorageConfig();
      validS3Passed = config.driver === 's3' && config.bucket === 'my-production-bucket';
    } catch {
      validS3Passed = false;
    }
    assert(validS3Passed, 'Valid STORAGE_DRIVER=s3 and bucket configuration passes');

    // ------------------------------------------------------------------------
    // Test 4: /api/health/live does not require DB or external services
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Liveness Probe Isolation ---');
    const liveResponse = await getLiveHealth();
    const liveBody = await liveResponse.json();

    assert(
      liveResponse.status === 200 && liveBody.status === 'ok' && typeof liveBody.uptime === 'number',
      '/api/health/live responds 200 without DB dependency',
    );

    // ------------------------------------------------------------------------
    // Test 5 & 6: /api/health/ready detects DB health
    // ------------------------------------------------------------------------
    console.log('\n--- 5 & 6. Readiness Probe Dependency Verification ---');
    // Test readiness handler import
    const { GET: getReadyHealth } = await import('../src/app/api/health/ready/route');
    const readyResponse = await getReadyHealth();
    const readyBody = await readyResponse.json();

    // In local dev environment with Docker running, Postgres is reachable
    if (readyResponse.status === 200) {
      assert(
        readyBody.status === 'ok' &&
        readyBody.dependencies?.database?.status === 'connected',
        '/api/health/ready reports 200 when DB is connected',
      );
    } else {
      assert(
        readyResponse.status === 503 && readyBody.status === 'degraded',
        '/api/health/ready correctly returns 503 when dependencies are offline',
      );
    }

    // ------------------------------------------------------------------------
    // Test 7: Migration refuses missing production passwords
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Migration Password Policy ---');
    let migrationRefusedProd = false;
    try {
      validateMigrationPasswords({ NODE_ENV: 'production' });
    } catch (err: any) {
      migrationRefusedProd = err.message.includes('APP_DB_PASSWORD and SERVICE_DB_PASSWORD must be explicitly provided');
    }
    assert(migrationRefusedProd, 'Migration refuses missing passwords when NODE_ENV=production');

    const devPasswords = validateMigrationPasswords({ NODE_ENV: 'development' });
    assert(
      devPasswords.appPassword === 'formflow_app_dev' && devPasswords.servicePassword === 'formflow_service_dev',
      'Migration provides safe development fallback passwords in development',
    );

    // ------------------------------------------------------------------------
    // Test 8: Worker compiles to JavaScript
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Standalone Worker & Migration Build ---');
    const workerJsPath = path.join(process.cwd(), 'dist/worker/index.js');
    const migrateJsPath = path.join(process.cwd(), 'dist/db/migrate.js');
    const migrationsDir = path.join(process.cwd(), 'dist/db/migrations');

    assert(fs.existsSync(workerJsPath), 'Worker compiles to JavaScript (dist/worker/index.js exists)');
    assert(fs.existsSync(migrateJsPath), 'Migration runner compiles to JavaScript (dist/db/migrate.js exists)');
    assert(
      fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).length > 0,
      'Migration SQL files copied to dist/db/migrations',
    );

    // ------------------------------------------------------------------------
    // Test 9: Existing worker behavior remains intact
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Worker Execution Validation ---');
    let workerOutput = '';
    let workerExitedExpectedly = false;
    try {
      // Run compiled worker without SUBMISSIONS_QUEUE_URL — must exit 1 with clean log
      execSync('node dist/worker/index.js', {
        env: { ...process.env, SUBMISSIONS_QUEUE_URL: '' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err: any) {
      workerExitedExpectedly = err.status === 1;
      workerOutput = (err.stdout || '') + (err.stderr || '');
    }
    assert(
      workerExitedExpectedly && workerOutput.includes('SUBMISSIONS_QUEUE_URL not configured'),
      'Existing worker behavior intact: exits with code 1 when queue is unconfigured without tsx',
    );
  } finally {
    // Restore environment
    process.env = originalEnv;
  }

  console.log('\n========================================');
  console.log(`Summary: ${passes} passed, ${failures} failed.`);
  if (failures > 0) {
    console.error('❌ Some production-readiness tests failed.');
    process.exit(1);
  } else {
    console.log('🎉 ALL PRODUCTION READINESS TESTS PASSED!');
    process.exit(0);
  }
}

runProductionReadinessTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
