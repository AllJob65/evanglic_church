import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const isVercel = Boolean(process.env.VERCEL);

console.log('[Build] 1/3 Running Vite frontend build...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('[Build] 2/3 Bundling Express server to dist/server.cjs...');
execSync(
  'npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs',
  { stdio: 'inherit' }
);

if (isVercel) {
  console.log('[Build] 3/3 Generating Vercel Build Output API v3 (.vercel/output)...');
  const outRoot = path.join(process.cwd(), '.vercel', 'output');
  const staticDir = path.join(outRoot, 'static');
  const funcDir = path.join(outRoot, 'functions', 'api.func');

  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(staticDir, { recursive: true });
  fs.mkdirSync(funcDir, { recursive: true });

  // Copy compiled Vite static files (dist/* except server.cjs) into .vercel/output/static
  const distDir = path.join(process.cwd(), 'dist');
  for (const entry of fs.readdirSync(distDir)) {
    if (entry.startsWith('server.cjs')) continue;
    fs.cpSync(path.join(distDir, entry), path.join(staticDir, entry), { recursive: true });
  }

  // Detect the active Node.js major version on the build container (defaults to nodejs22.x)
  const detectedMajor = parseInt(process.versions.node.split('.')[0], 10);
  const runtimeMajor = detectedMajor >= 22 ? detectedMajor : 22;
  const vercelRuntime = process.env.VERCEL_NODE_RUNTIME || `nodejs${runtimeMajor}.x`;

  // Bundle self-contained serverless function handler (marking dev-only vite external)
  const banner = `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`;
  execSync(
    `npx esbuild api/index.ts --bundle --platform=node --target=node${runtimeMajor} --format=esm --external:vite --banner:js="${banner}" --outfile="${path.join(funcDir, 'index.mjs')}"`,
    { stdio: 'inherit' }
  );

  // Copy cmms_db.json into the function directory so initial state is always present
  const dbJsonPath = path.join(process.cwd(), 'cmms_db.json');
  if (fs.existsSync(dbJsonPath)) {
    fs.copyFileSync(dbJsonPath, path.join(funcDir, 'cmms_db.json'));
  }

  // Write .vc-config.json for the Node.js Serverless Function
  const vcConfig = {
    runtime: vercelRuntime,
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
    maxDuration: 30,
  };
  fs.writeFileSync(path.join(funcDir, '.vc-config.json'), JSON.stringify(vcConfig, null, 2));

  // Write config.json (Build Output API v3 routing specification)
  const outputConfig = {
    version: 3,
    routes: [
      {
        src: '^/api(?:/(.*))?$',
        dest: '/api?__path=$1',
      },
      {
        handle: 'filesystem',
      },
      {
        src: '^/(?!api(?:/|$))(.*)$',
        dest: '/index.html',
      },
    ],
  };
  fs.writeFileSync(path.join(outRoot, 'config.json'), JSON.stringify(outputConfig, null, 2));
  console.log('[Build] Vercel Build Output API v3 (.vercel/output) generated successfully.');
} else {
  console.log('[Build] 3/3 Local/Container build completed.');
}
