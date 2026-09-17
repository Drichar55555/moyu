const assert=require('node:assert/strict');
const {once}=require('node:events');
const {chromium}=require('playwright');
const {createMoyuServer}=require('../server.cjs');
(async()=>{
 const mails=[];
 const server=createMoyuServer({dbPath:':memory:',sendMail:async m=>mails.push(m)});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'chromium',headless:true});
 const context=await browser.newContext();const page=await context.newPage();
 // Record any call to showModal, not just whether an animation has already ended.
 await context.addInitScript(()=>{globalThis.introOpens=0;const original=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='intro')globalThis.introOpens++;return original.call(this);};});
 async function checkSkipped(){await page.locator('#article-grid .article-card').first().waitFor();assert.equal(await page.evaluate(()=>globalThis.introOpens),0);assert.equal(await page.locator('#intro').evaluate(el=>el.open),false);assert.equal(new URL(page.url()).searchParams.has('accountReturn'),false);}
 try{
  await page.goto(`${base}/account.html`);await page.locator('[data-mode="register"]').click();
  await page.locator('#account-handle').fill('return_test');await page.locator('#account-name').fill('回访');await page.locator('#account-password').fill('12345678');await page.locator('#account-consent').check();await page.locator('#register-email').fill('return@example.com');
  await page.locator('[data-account="send-code"]').click();await page.getByText(/验证码已发送/).waitFor();await page.locator('#register-code').fill(mails[0].code);await page.locator('#auth-form button[type=submit]').click();await page.waitForURL('**/index.html*');await checkSkipped();
  await page.locator('[data-account-link]').click();await page.locator('#profile-name').fill('保存后返回');await page.locator('#profile-form button[type=submit]').click();await page.waitForURL('**/index.html*');await checkSkipped();
  await page.locator('[data-account-link]').click();await page.locator('[data-account="logout"]').click();await page.locator('#account-handle').fill('return_test');await page.locator('#account-password').fill('12345678');await page.locator('#auth-form button[type=submit]').click();await page.waitForURL('**/index.html*');await checkSkipped();
  await page.reload();await page.locator('#article-grid .article-card').first().waitFor();assert.equal(await page.evaluate(()=>globalThis.introOpens),1,'Reload plays normally after marker consumption');await page.locator('#skip-intro').click();await page.locator('#intro').waitFor({state:'hidden'});
  await page.locator('#replay-intro').click();assert.equal(await page.evaluate(()=>globalThis.introOpens),2);await page.locator('#skip-intro').click();await page.locator('#intro').waitFor({state:'hidden'});
  await page.goto(`${base}/account.html?returnTo=${encodeURIComponent('/?preview=keep#reading')}`);await page.locator('#profile-form button[type=submit]').click();await page.waitForURL(`${base}/?preview=keep#reading`);await checkSkipped();
  await page.goto(`${base}/account.html?returnTo=${encodeURIComponent('/index.html#article=useless')}`);await page.locator('#profile-form button[type=submit]').click();await page.waitForURL('**/index.html#article=useless');await page.locator('#reader-dialog').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>globalThis.introOpens),0);
  await page.goto(`${base}/account.html`);await page.locator('#account-return').click();await page.waitForURL('**/index.html*');await checkSkipped();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('blocked');};});const p=await blocked.newPage();await p.goto(`${base}/index.html?accountReturn=1`);await p.locator('#article-grid .article-card').first().waitFor();assert.equal(await p.locator('#intro').evaluate(el=>el.open),false);await blocked.close();
  console.log('PASS: registration, login, profile save and manual account return never open intro; marker consumed; root/query/hash retained; article opens; normal reload/replay still work; no storage dependency.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});