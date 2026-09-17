const assert=require('node:assert/strict');
const {once}=require('node:events');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createMoyuServer}=require('../server.cjs');
(async()=>{
 const server=createMoyuServer({dbPath:':memory:',sendMail:null});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`,out=path.join(__dirname,'../test-results');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chromium',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.locator('#intro').waitFor({state:'hidden'});await page.locator('#main-nav a[href="activities.html"]').click();await page.waitForURL('**/activities.html');assert.equal(await page.locator('.activity-card').count(),2);assert.equal(await page.locator('#intro').count(),0);
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,'activity-directory-desktop.png'),fullPage:true});
  for(const width of [375,620,768,1024,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(out,'activity-directory-mobile.png'),fullPage:true});
  await page.locator('.activity-card').first().click();await page.waitForURL('**/capsule.html?compose=1');await page.locator('.rank-item').first().waitFor();assert.equal(await page.locator('h1').textContent(),'职业时光胶囊');assert.equal(await page.locator('.steps,.number-label,.event-seal,.rank-name small').count(),0);assert.equal(await page.locator('.rank-item').count(),8);assert.equal(await page.locator('#capsule-consent-row').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,'capsule-focused-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'下移收银员',exact:true}).click();assert.equal(await page.locator('.rank-name strong').first().textContent(),'翻译');
  await page.locator('#capsule-email').fill('test@example.com');assert.equal(await page.locator('#capsule-consent-row').isVisible(),true);await page.locator('#capsule-form button[type=submit]').click();assert.match(await page.locator('#consent-error').textContent(),/勾选同意/);
  await page.locator('#capsule-email').fill('');assert.equal(await page.locator('#capsule-consent-row').isVisible(),false);await page.locator('#capsule-form button[type=submit]').click();await page.locator('.personal-order').waitFor();
  await page.locator('.event-header a[href="activities.html"]').click();await page.locator('.activity-card').first().click();await page.locator('.rank-item').first().waitFor();assert.equal(await page.locator('.rank-name strong').first().textContent(),'翻译','existing result can still enter editor from card');
  await page.locator('.event-header a[href="activities.html"]').click();await page.locator('.activity-card').nth(1).click();await page.waitForURL('**/generations.html');await page.locator('.setup').waitFor();await page.locator('.event-header a[href="activities.html"]').click();
  await page.locator('[data-account-link]').click();await page.locator('#auth-form').waitFor();assert.equal(await page.locator('#account-return').getAttribute('href'),`${base}/activities.html`);await page.locator('#account-return').click();await page.locator('.activity-card').first().waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: activity card navigation, both detail routes, saved-order reentry, minimal capsule content, mobile layout, sorting, optional email consent, account return to directory.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});