const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.env.MOYU_TEST_URL||'http://127.0.0.1:4175';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chromium'});
 const context=await browser.newContext({viewport:{width:1100,height:1000},reducedMotion:'no-preference'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function settle(){await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.rank-item')].flatMap(el=>el.getAnimations()).map(a=>a.finished.catch(()=>{})));});}
 try{
  await page.goto(`${base}/capsule.html?compose=1`);await page.locator('.rank-item').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  const initial=await page.evaluate(()=>{
   const row=document.querySelector('[data-job="cashier"]');globalThis.originalRankNode=row;
   const y=row.getBoundingClientRect().top;
   row.querySelector('[data-move="1"]').click();
   const animations=[...document.querySelectorAll('.rank-item')].flatMap(el=>el.getAnimations().filter(a=>a.effect.getKeyframes().some(k=>k.transform)));
   animations.forEach(a=>{a.pause();a.currentTime=0;});
   return {animated:animations.length,stable:row===document.querySelector('[data-job="cashier"]'),delta:Math.abs(row.getBoundingClientRect().top-y),active:row.classList.contains('rank-moving'),displaced:document.querySelector('[data-job="translator"]').classList.contains('rank-displaced'),rank:row.querySelector('.rank-number').textContent};
  });
  assert.equal(initial.animated,2);assert.equal(initial.stable,true);assert.ok(initial.delta<1);assert.equal(initial.active,true);assert.equal(initial.displaced,true);assert.equal(initial.rank,'02');
  await page.evaluate(()=>document.querySelectorAll('.rank-item').forEach(el=>el.getAnimations().forEach(a=>{a.currentTime=150;a.pause();})));
  await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/rank-motion-midpoint.png')});
  // Interrupt a halfway motion and verify the next transition begins where it is painted.
  const continuity=await page.evaluate(()=>{
   const row=document.querySelector('[data-job="cashier"]'),y=row.getBoundingClientRect().top;
   row.querySelector('[data-move="1"]').click();
   document.querySelectorAll('.rank-item').forEach(el=>el.getAnimations().forEach(a=>{a.pause();a.currentTime=0;}));
   return {delta:Math.abs(row.getBoundingClientRect().top-y),rank:row.querySelector('.rank-number').textContent};
  });assert.ok(continuity.delta<1);assert.equal(continuity.rank,'03');
  await page.evaluate(()=>document.querySelectorAll('.rank-item').forEach(el=>el.getAnimations().forEach(a=>a.play())));await settle();
  await page.evaluate(()=>{for(let i=0;i<4;i++)document.querySelector('[data-job="cashier"] [data-move="1"]').click();document.querySelector('[data-job="cashier"] [data-move="-1"]').click();});await settle();
  assert.equal(await page.locator('[data-job="cashier"] .rank-number').textContent(),'06');assert.equal(await page.locator('.rank-item').count(),8);
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'上移收银员');
  await page.reload();await page.locator('.rank-item').first().waitFor();
  await page.locator('[data-job="cashier"]').dragTo(page.locator('[data-job="developer"]'));
  assert.equal(await page.locator('[data-job="cashier"] .rank-number').textContent(),'05');
  assert.match(await page.locator('#activity-status').textContent(),/4 个职业/);await settle();
  await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'上移收银员',exact:true}).focus();await page.keyboard.press('Enter');await settle();
  assert.equal(await page.locator('[data-job="cashier"] .rank-number').textContent(),'04');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(()=>{document.querySelector('[data-job="cashier"] [data-move="-1"]').click();return {animations:[...document.querySelectorAll('.rank-item')].flatMap(el=>el.getAnimations()).length,highlight:document.querySelector('[data-job="cashier"]').classList.contains('rank-moving'),rank:document.querySelector('[data-job="cashier"] .rank-number').textContent};});
  assert.equal(reduced.animations,0);assert.equal(reduced.highlight,true);assert.equal(reduced.rank,'03');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{document.querySelector('[data-job="cashier"] [data-move="1"]').click();document.querySelector('#capsule-form').requestSubmit();});
  await page.locator('.personal-order').waitFor();assert.equal(await page.locator('.personal-order li strong').nth(3).textContent(),'收银员');
  await page.locator('[data-action="edit-capsule"]').click();assert.equal(await page.locator('.rank-moving,.rank-displaced,.rank-settled').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: both cards animate, node identity, start/midpoint continuity, rapid interrupted moves, correct ranks/focus, long-distance native drag, mobile keyboard move, reduced-motion highlight without movement, submit mid-animation and cleanup.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});