import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
mkdirSync(distDir, { recursive: true });

const bootstrap = [
  "import { tsImport } from 'tsx/esm/api';",
  '',
  "await tsImport('../src/server.ts', import.meta.url);",
  ''
].join('\n');

writeFileSync(resolve(distDir, 'server.js'), bootstrap);
