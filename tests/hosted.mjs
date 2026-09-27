import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installFixture, createArtworkFixture } from '../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs';

// Reproduce private hosting: require a SameSite login cookie for every asset.
// A sandboxed child must not rely on authenticated network subresource requests.
const requests=[];
const server=createServer(async (req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 requests.push({pathname,cookie:!!req.headers.cookie?.includes('garden_test_auth=1'),site:req.headers['sec-fetch-site']});
 if(!req.headers.cookie?.includes('garden_test_auth=1')) {res.writeHead(401,{'Content-Type':'text/html'}).end('<h1>Private site sign-in required</h1>');return;}
 const files={'/':'index.html','/runtime.js':'runtime.js','/runtime.css':'runtime.css'};
 const file=files[pathname]; if(!file){res.writeHead(404).end();return;}
 const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(await readFile(new URL('../build/'+file,import.meta.url)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try {
 for(const width of [960,390]) {
  const context=await browser.newContext({viewport:{width,height:860},hasTouch:width<500,reducedMotion:'reduce'});
  await context.addCookies([{name:'garden_test_auth',value:'1',url:origin,sameSite:'Strict',httpOnly:true}]);
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const fixture=await installFixture(page,origin,{artworkCall:await createArtworkFixture()});
  await page.goto(origin);
  assert.equal(await page.locator('.rf-frame-viewport > iframe').count(),0,'ownership gate remains before connection');
  await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
  await page.getByRole('button',{name:/^Friend #7730\b/}).click();
  const frame=page.locator('.rf-frame-viewport > iframe');
  const game=page.frameLocator('.rf-frame-viewport > iframe');
  await game.getByRole('button',{name:'Get dream seeds',exact:true}).waitFor();
  await page.locator('.rf-runtime-status').waitFor({state:'hidden'});
  assert.match(await frame.getAttribute('src'),/^blob:/);
  assert.equal(await frame.getAttribute('sandbox'),'allow-scripts');
  assert.equal(await game.locator('body').evaluate(()=>{try{return !!parent.document;}catch{return false;}}),false);
  const csp=await game.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  assert.match(csp,/script-src 'sha256-/); assert(!csp.includes("script-src 'unsafe-inline'"));
  assert(fixture.ownerReads>=2,'fresh ownership reads are preserved');
  if(width<500) await game.getByRole('button',{name:'Get dream seeds',exact:true}).tap();
  else await game.getByRole('button',{name:'Get dream seeds',exact:true}).click();
  await game.getByRole('button',{name:'Buy 1 dream seed · 1 RF',exact:true}).click();
  await page.getByRole('button',{name:'Confirm preview',exact:true}).click();
  await game.getByRole('button',{name:'Plant a seed',exact:true}).click();
  await page.getByRole('button',{name:'Confirm preview',exact:true}).click();
  await game.getByRole('button',{name:'Water · 0/2',exact:true}).click();
  await game.getByRole('button',{name:'Water · 1/2',exact:true}).click();
  await game.getByRole('button',{name:'Reveal flower',exact:true}).click();
  await game.getByRole('button',{name:'Let it bloom',exact:true}).click();
  assert.equal(await game.locator('.plot.bloom').count(),1);
  assert.deepEqual(errors,[]); assert.deepEqual(fixture.errors,[]);
  assert(requests.every(r=>['/','/runtime.js','/runtime.css','/favicon.ico'].includes(r.pathname)),'no game document, script, stylesheet or image fetched from opaque child');
  console.log(`PASS hosted ${width}px: Strict-cookie private host; gate; opaque sandbox; hash-pinned CSP; seed-to-bloom; no child asset requests; no console errors`);
  await context.close();
 }
} finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
