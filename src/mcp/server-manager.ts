import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STARTUP_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 200;

/** Check if the markbase server is reachable; if not, start it. */
export async function ensureServerRunning(configPath: string, port: number): Promise<void> {
  const baseUrl = `http://localhost:${port}`;

  if (await isReachable(baseUrl)) {
    return;
  }

  await startServerProcess(configPath, port);
  await waitForServer(baseUrl);
}

async function isReachable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/collections/_health/query`, {
      signal: AbortSignal.timeout(1000),
    });
    // Any response (even 404) means the server is running
    return true;
  } catch {
    return false;
  }
}

function startServerProcess(configPath: string, port: number): void {
  const cliPath = resolve(fileURLToPath(import.meta.url), '../../cli/index.js');

  const child = spawn(
    process.execPath,
    [cliPath, 'serve', '--config', configPath, '--port', String(port)],
    {
      stdio: 'ignore',
      detached: true,
    },
  );

  // Let the child run independently
  child.unref();
}

async function waitForServer(baseUrl: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isReachable(baseUrl)) {
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`markbase server did not start within ${STARTUP_TIMEOUT_MS / 1000}s`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
