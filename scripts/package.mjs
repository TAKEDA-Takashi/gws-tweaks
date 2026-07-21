// Chrome Web Store提出用のzipをdist/に作る。
// Storeへの「新規アイテム」の初回アップロードはmanifestにkeyを含められないため、
// 既定でkeyを除いてパッケージする。初回アップロード後にStoreの公開鍵へ
// manifest.jsonのkeyを差し替えたら、以降は --keep-key を付けて実行する。
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const keepKey = process.argv.includes('--keep-key');
const root = fileURLToPath(new URL('..', import.meta.url));
const ext = root + 'extension/';

const manifest = JSON.parse(readFileSync(ext + 'manifest.json', 'utf8'));
if (!keepKey) {
  delete manifest.key;
}

const stage = root + 'dist/package';
rmSync(root + 'dist', { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
writeFileSync(stage + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
cpSync(ext + 'src', stage + '/src', { recursive: true });
cpSync(ext + 'icons', stage + '/icons', { recursive: true });

const zipName = 'gws-tweaks-v' + manifest.version + '.zip';
execFileSync('zip', ['-r', '-X', '../' + zipName, '.'], { cwd: stage, stdio: 'inherit' });
console.log('created: dist/' + zipName + (keepKey ? ' (keyあり)' : ' (keyなし)'));
