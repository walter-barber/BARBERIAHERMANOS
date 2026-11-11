// Publica una actualización de la app de los barberos.
//
//   npm run app:publicar            → solo pantallas y funciones (llega en vivo, sin instalar nada)
//   npm run app:publicar -- --apk   → también un APK nuevo (cuando cambian íconos, permisos o complementos;
//                                     antes sube versionCode en android/app/build.gradle)
//
// Deja los archivos en ../PUBLICAR-APP/ (fuera del repositorio, que es público):
//   version.json, web-<versión>.zip y, con --apk, BarberiaHermanos.apk
// Si existe ~/.salon-hermanos/supabase-service-walter.txt (llave de servicio de Supabase), los sube solo
// al almacenamiento privado «app». Si no, se suben a mano en Supabase → Storage → app (reemplazando).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(root, '..', 'PUBLICAR-APP');
const withApk = process.argv.includes('--apk');
const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });

const version = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const apkBuild = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1] ?? 0);
console.log(`\nVersión de las pantallas: ${version} · APK (versionCode): ${apkBuild}\n`);

// 1. Pantallas de la app
run('npm run build:app', { env: { ...process.env, APP_WEB_VERSION: version } });
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) {
  if (/^web-.*\.zip$/.test(f) || f === 'version.json' || (withApk && f === 'BarberiaHermanos.apk')) fs.rmSync(path.join(out, f));
}
const webFile = `web-${version}.zip`;
// tar de Windows (no Compress-Archive: ese guarda las carpetas con «\» y en Android no se abren)
const entries = fs.readdirSync(path.join(root, 'dist-app')).map((e) => `"${e}"`).join(' ');
run(`"C:\\Windows\\System32\\tar.exe" -a -c -f "${path.join(out, webFile)}" -C dist-app ${entries}`, { shell: 'cmd.exe' });

// 2. APK (opcional)
if (withApk) {
  run('npx cap sync android');
  run('.\\gradlew.bat assembleRelease -q', {
    cwd: path.join(root, 'android'),
    env: { ...process.env, JAVA_HOME: 'C:\\Program Files\\Android\\Android Studio\\jbr' },
    shell: true,
  });
  fs.copyFileSync(path.join(root, 'android/app/build/outputs/apk/release/app-release.apk'), path.join(out, 'BarberiaHermanos.apk'));
}

const info = { web: version, webFile, apk: apkBuild };
fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify(info, null, 2) + '\n');
console.log(`\nListo en ${out}:`, fs.readdirSync(out).join(', '));

// 3. Subir (si está la llave de servicio)
const keyFile = path.join(os.homedir(), '.salon-hermanos', 'supabase-service-walter.txt');
if (!fs.existsSync(keyFile)) {
  console.log('\nNo está la llave de servicio: sube esos archivos a mano en Supabase → Storage → app (reemplazando).');
  process.exit(0);
}
const serviceKey = fs.readFileSync(keyFile, 'utf8').trim();
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env.app'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const base = env.VITE_SUPABASE_URL;
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

await fetch(`${base}/storage/v1/bucket`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'app', name: 'app', public: false }),
}); // si ya existe, no pasa nada

const upload = async (name, type) => {
  const r = await fetch(`${base}/storage/v1/object/app/${name}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': type, 'x-upsert': 'true', 'cache-control': 'no-cache' },
    body: fs.readFileSync(path.join(out, name)),
  });
  if (!r.ok) throw new Error(`No se pudo subir ${name}: ${r.status} ${await r.text()}`);
  console.log('Subido', name);
};
await upload(webFile, 'application/zip');
if (withApk) await upload('BarberiaHermanos.apk', 'application/vnd.android.package-archive');
await upload('version.json', 'application/json'); // de último: así nadie ve una versión a medio subir
console.log('\nActualización publicada. Los barberos la reciben al abrir la app.');
