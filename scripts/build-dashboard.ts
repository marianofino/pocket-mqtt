import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAdminStaticAssets } from '../src/api/routes/admin-static.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const adminDistPath = resolve(projectRoot, 'dist/public/admin');

async function main() {
  try {
    await ensureAdminStaticAssets(adminDistPath);
    console.log(`Admin dashboard assets prepared at ${adminDistPath}`);
  } catch (err) {
    console.error('Failed to prepare admin dashboard assets:', err);
    process.exitCode = 1;
  }
}

await main();
