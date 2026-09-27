import assert from 'node:assert/strict';
import { testGame } from '@rarefriends/friendsdk/testing';
const artifacts = new URL('../test-artifacts/', import.meta.url).pathname;
for (const width of [960, 390, 360]) {
  console.log(`Checking garden at ${width}px`);
  await testGame('./game', {
    width, height: 860, timeout: 20000, screenshot: `test-artifacts/garden-${width}.png`,
    check: async ({page, game}) => {
      await game.getByRole('button', {name:'Get dream seeds',exact:true}).waitFor();
      await game.getByRole('img', {name:'Your Rare Friend #7730'}).waitFor();
      await game.getByText('Loading Friend…', {exact:true}).waitFor({state:'hidden'});
      assert.equal(await game.getByText('Artwork unavailable', {exact:false}).count(),0);
      await page.locator('.rf-game-frame').screenshot({path:`test-artifacts/empty-${width}.png`});
      assert.equal(await game.getByRole('button', {name:/Plot \d:/}).count(),6);
      const frameSize = await page.locator('.rf-game-frame').boundingBox();
      assert(frameSize.width <= 960 && frameSize.height <= 640, 'game stays within 960 by 640 frame');
      await game.getByRole('button', {name:'Get dream seeds',exact:true}).click();
      await game.getByRole('button', {name:'Buy 1 dream seed · 1 RF',exact:true}).click();
      await page.getByRole('button', {name:'Cancel',exact:true}).click();
      await game.getByRole('button', {name:'Buy 1 dream seed · 1 RF',exact:true}).waitFor({state:'visible'});
      await game.getByRole('button', {name:'Buy 1 dream seed · 1 RF',exact:true}).click();
      await page.getByRole('button', {name:'Confirm preview',exact:true}).click();
      await game.getByRole('button', {name:'Plant a seed',exact:true}).click();
      await page.getByRole('button', {name:'Cancel',exact:true}).click();
      await game.getByRole('button', {name:'Plant a seed',exact:true}).click();
      await page.getByRole('button', {name:'Confirm preview',exact:true}).click();
      await game.getByRole('button', {name:'Water · 0/2',exact:true}).click();
      await game.getByRole('button', {name:'Water · 1/2',exact:true}).click();
      await game.getByRole('button', {name:'Settings',exact:true}).click();
      const remaining = await game.locator('.selected-info p').textContent();
      await page.waitForTimeout(650);
      assert.equal(await game.locator('.selected-info p').textContent(),remaining,'growth pauses in menus');
      await game.getByRole('button', {name:'Close Garden settings',exact:true}).click();
      await game.getByRole('button', {name:'Reveal flower',exact:true}).click({timeout:12000});
      await game.getByRole('button', {name:'Let it bloom',exact:true}).click();
      await game.getByRole('button', {name:'Flower journal',exact:true}).click();
      assert.match(await game.locator('.rf-frame-menu-body').innerText(),/1 of 6 varieties discovered/);
      assert.equal(await game.locator('.journal-entry.found').count(),1);
      await game.locator('.journal-entry.found').getByRole('button',{name:'Redeem one',exact:true}).click();
      await page.getByRole('button', {name:'Confirm preview',exact:true}).click();
      await game.locator('.journal-entry.found').getByText(/0 owned/).waitFor();
      assert.equal(await game.locator('.journal-entry.found').count(),1,'discovery persists after redemption');
      await game.getByRole('button', {name:'Close Your flower journal',exact:true}).click();
      const box = await game.locator('.garden-surface').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
      assert(box.scroll<=box.width+1,'no horizontal overflow');
      assert.equal(await game.locator('.plot.bloom').count(),1,'decorative flower remains after redemption');
      await page.locator('.rf-game-frame').screenshot({path:`test-artifacts/bloom-${width}.png`});
      await game.getByRole('button',{name:'Keep & replant',exact:true}).click();
      assert.equal(await game.locator('.plot.bloom').count(),0);
      await game.getByRole('button', {name:'Settings',exact:true}).click();
      await game.getByRole('checkbox',{name:'Reduce motion',exact:true}).check();
      await game.getByRole('button', {name:'Close Garden settings',exact:true}).click();
      assert.equal(await game.locator('.dream-garden.still').count(),1);
    }
  });
  console.log(`PASS ${width}px: buy/cancel, plant/cancel, water, pause, reveal, journal, redeem, replant, layout, motion`);
}

