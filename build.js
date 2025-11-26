// Simple build script using esbuild to produce a single bundle and copy wasm
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'scripts');

async function build(){
  console.log('Start build...');
  // bundle src/app.js into public/bundle.js
  // read package.json version and inject as build-time constant __APP_VERSION__
  let appVersion = '0.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    appVersion = pkg.version || appVersion;
  } catch (e) {
    console.warn('Could not read package.json to obtain version:', e.message);
  }

  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'app.js')],
    bundle: true,
    minify: true,
    sourcemap: false,
    outfile: path.join(outDir, 'bundle.js'),
    platform: 'browser',
    target: ['es2017'],
    define: {
      '__APP_VERSION__': JSON.stringify(appVersion)
    }
  });

  // copy wasm from sql.js package to public/
  const pkgDist = path.join(__dirname, 'node_modules', 'sql.js', 'dist');
  const wasmSrc = path.join(pkgDist, 'sql-wasm.wasm');
  const wasmDest = path.join(outDir, 'sql-wasm.wasm');
  const jsSrc = path.join(pkgDist, 'sql-wasm.js');
  const jsDest = path.join(outDir, 'sql-wasm.js');
  if(fs.existsSync(pkgDist)){
    if(fs.existsSync(jsSrc)){
      fs.copyFileSync(jsSrc, jsDest);
      console.log('Copied sql-wasm.js to', jsDest);
    } else {
      console.warn('WARN: sql-wasm.js not found at', jsSrc);
    }
    if(fs.existsSync(wasmSrc)){
      fs.copyFileSync(wasmSrc, wasmDest);
      console.log('Copied sql-wasm.wasm to', wasmDest);
    } else {
      console.warn('WARN: sql-wasm.wasm not found at', wasmSrc);
    }
  } else {
    console.warn('WARN: sql.js dist folder not found at', pkgDist);
    console.warn('If sql.js is not installed, run: npm install');
  }

  console.log('Build finished. Deploy the contents of the `public/` folder as static site.');
}

build().catch(err=>{ console.error(err); process.exit(1); });
