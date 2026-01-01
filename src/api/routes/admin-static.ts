import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { FastifyBaseLogger } from 'fastify';

const DEFAULT_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PocketMQTT Admin</title>
    <link rel="stylesheet" href="/admin/assets/style.css" />
  </head>
  <body>
    <div id="root" class="fallback">
      <h1>PocketMQTT Admin</h1>
      <p>The production dashboard bundle is not available. This lightweight fallback keeps the admin routes usable for local testing.</p>
      <p>Run <code>npm run build:dashboard:full</code> to generate the full React dashboard.</p>
    </div>
    <script type="module" src="/admin/assets/main.js"></script>
  </body>
</html>`;

const DEFAULT_MAIN_JS = `const root = document.getElementById('root');
if (root) {
  const banner = document.createElement('p');
  banner.className = 'fallback-note';
  banner.textContent = 'Fallback admin shell is active. Replace with the built dashboard when ready.';
  root.appendChild(banner);
}`;

const DEFAULT_CSS = `:root {
  color-scheme: light dark;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 10% 20%, #0ea5e9 0, transparent 25%),
    radial-gradient(circle at 80% 0%, #22d3ee 0, transparent 30%),
    radial-gradient(circle at 50% 80%, #0ea5e9 0, transparent 25%),
    #0b1120;
  color: #e2e8f0;
}

.fallback {
  max-width: 640px;
  padding: 2.5rem;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.85);
  box-shadow: 0 25px 70px rgba(15, 23, 42, 0.35);
}

.fallback h1 {
  margin: 0 0 0.75rem;
  font-size: 2rem;
}

.fallback p {
  margin: 0.25rem 0 0;
  line-height: 1.6;
}

.fallback code {
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
  background: rgba(226, 232, 240, 0.1);
  color: #bae6fd;
}

.fallback-note {
  margin-top: 1rem;
  font-size: 0.95rem;
  color: #cbd5e1;
}`;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (err: unknown) {
    return false;
  }
}

/**
 * Ensure the admin dashboard static assets exist. Generates a minimal fallback
 * bundle (HTML/CSS/JS) when the real dashboard build output is missing so the
 * admin routes remain functional in test and dev environments.
 *
 * @param adminDistPath - Absolute path to the admin dashboard dist directory.
 * @param logger - Optional Fastify logger for structured log output.
 */
export async function ensureAdminStaticAssets(adminDistPath: string, logger?: FastifyBaseLogger): Promise<void> {
  const indexPath = path.join(adminDistPath, 'index.html');
  const assetsDir = path.join(adminDistPath, 'assets');

  const indexExists = await fileExists(indexPath);
  
  if (!indexExists) {
    logger?.warn('Admin dashboard assets missing. Generating lightweight fallback bundle.');

    await mkdir(assetsDir, { recursive: true });
    await writeFile(indexPath, DEFAULT_INDEX_HTML, 'utf-8');
    await writeFile(path.join(assetsDir, 'main.js'), DEFAULT_MAIN_JS, 'utf-8');
    await writeFile(path.join(assetsDir, 'style.css'), DEFAULT_CSS, 'utf-8');

    logger?.info({ adminDistPath }, 'Admin dashboard fallback assets ready');
  }
}
