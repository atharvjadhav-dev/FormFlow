/**
 * Next.js Instrumentation hook.
 * Executes once on server startup in the Node.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupGracefulShutdown } = await import('@/lib/shutdown');
    setupGracefulShutdown();
  }
}
