import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Private hosts may withhold cookies from an opaque sandbox. Deliver the entire
// child via the authenticated parent bundle, without adding allow-same-origin.
const root = process.cwd();
const common = {
  absWorkingDir: root, bundle: true, format: 'iife', platform: 'browser',
  target: 'es2022', jsx: 'automatic', minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl', '.woff2': 'dataurl', '.wav': 'dataurl', '.mp3': 'dataurl' },
};
const child = await build({ ...common, write: false, outfile: 'embedded-game.js', stdin: {
  resolveDir: root, sourcefile: 'embedded-game.tsx', loader: 'tsx', contents: `
import { createRoot } from 'react-dom/client';
import { GameSession } from '@rarefriends/friendsdk/runtime';
import { parseChanceGame } from '@rarefriends/friendsdk/game';
import '@rarefriends/friendsdk/frame.css';
import '@rarefriends/friendsdk/runtime.css';
import definitionJson from './game/game.json';
import Game from './game/index';
const definition = parseChanceGame(definitionJson);
createRoot(document.getElementById('root')).render(<GameSession definition={definition}>{props => <Game {...props}/>}</GameSession>);`
}});
const js = child.outputFiles.find(file => file.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = child.outputFiles.find(file => file.path.endsWith('.css')).text;
if (/<\/style/i.test(css)) throw new Error('Unexpected style closing tag in CSS');
const hash = createHash('sha256').update(js).digest('base64');
// Only the exact compiled script may execute. Parent access and nested frames
// remain disallowed. Images/fonts are embedded; the sole network API is artwork RPC.
const csp = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src https://rpc.mainnet.chain.robinhood.com; base-uri 'none'; form-action 'none'; frame-src 'none'`;
const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Dream Garden</title><style>${css}\n*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0;overflow:hidden}</style></head><body><main id="root"></main><script>${js}</script></body></html>`;
const outdir = path.join(root, 'build');
await mkdir(outdir, { recursive: true });
await build({ ...common, outfile: path.join(outdir, 'runtime.js'), stdin: {
  resolveDir: root, sourcefile: 'hosted-runtime.tsx', loader: 'tsx', contents: `
import { createRoot } from 'react-dom/client';
import { GameHost } from '@rarefriends/friendsdk/runtime';
import { parseChanceGame } from '@rarefriends/friendsdk/game';
import '@rarefriends/friendsdk/frame.css';
import '@rarefriends/friendsdk/runtime.css';
import './game/host.css';
import definitionJson from './game/game.json';
const definition = parseChanceGame(definitionJson);
const frameUrl = URL.createObjectURL(new Blob([${JSON.stringify(document)}], { type: 'text/html' }));
createRoot(document.getElementById('root')).render(<GameHost definition={definition} frameUrl={frameUrl}/>);`
}});
await writeFile(path.join(outdir, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Plant a little night magic with your Rare Friend."><title>Dream Garden</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%220%22 fill=%22%23111111%22/%3E%3Cpath d=%22M12 3 15 9 21 12 15 15 12 21 9 15 3 12 9 9Z%22 fill=%22%23ccff00%22/%3E%3C/svg%3E"><link rel="stylesheet" href="./runtime.css"><style>*{box-sizing:border-box}html,body{margin:0}#root{max-width:960px;margin:auto}</style></head><body><main id="root"></main><script src="./runtime.js"></script></body></html>');
console.log('Built private-host compatible sandbox in build/ (inline script SHA-256 pinned; no child asset requests).');

