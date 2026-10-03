import { closeAllPools } from '@/db/client';

let isShuttingDown = false;

/**
 * Registers process signal handlers (SIGTERM, SIGINT) to gracefully close
 * PostgreSQL connection pools when the server container stops.
 */
export function setupGracefulShutdown() {
  if (typeof process === 'undefined') return;

  // Avoid duplicate registrations in dev hot-reloads
  if ((globalThis as any).__gracefulShutdownRegistered) {
    return;
  }
  (globalThis as any).__gracefulShutdownRegistered = true;

  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`[shutdown] ${signal} signal received. Initiating graceful shutdown...`);

    // Guard against hanging promises by forcing exit after 10 seconds
    const forceExitTimer = setTimeout(() => {
      console.error('[shutdown] Forced exit: graceful shutdown timed out after 10 seconds.');
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    try {
      console.log('[shutdown] Closing PostgreSQL connection pools...');
      await closeAllPools();
      console.log('[shutdown] PostgreSQL pools closed.');

      clearTimeout(forceExitTimer);
      console.log('[shutdown] Graceful cleanup finished. Process exiting cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[shutdown] Error encountered during graceful teardown:', err);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  process.once('SIGINT', () => handleShutdown('SIGINT'));
}
