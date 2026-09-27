import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:960,height:800}});
  await page.goto('http://localhost:4173');
  await page.getByRole('heading',{name:'Choose your Friend',exact:true}).waitFor();
  assert.equal(await page.locator('iframe').count(),0,'No game before eligible wallet');
  assert.match(await page.locator('body').innerText(),/wallet/i);
  await page.screenshot({path:'test-artifacts/real-disconnected-gate.png'});
  console.log('PASS real unmocked disconnected page: wallet selection gate present; playable iframe absent. Positive owned-wallet test still requires the user.');
} finally { await browser.close(); }
