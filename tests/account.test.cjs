const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {once}=require('node:events');
const path=require('node:path');
const fs=require('node:fs/promises');
const {createMoyuServer}=require('../server.cjs');
(async()=>{
 const mail=[];
 const server=createMoyuServer({dbPath:':memory:',sendMail:async m=>mail.push(m)});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,channel:'chromium'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function openAccount(){await page.locator('[data-account-link]').click();await page.locator('#profile-form,#auth-form').waitFor();}
 try{
  await page.goto(`${base}/capsule.html`);await page.locator('#capsule-form button[type=submit]').click();const guest=await page.evaluate(()=>localStorage.getItem('moyu:activity:capsule-v1'));
  await openAccount();await page.locator('[data-mode="register"]').click();
  await page.locator('#account-handle').fill('中文账号');await page.locator('#account-name').fill('听雨');await page.locator('#account-password').fill('12345678');await page.locator('#account-consent').check();
  await page.locator('#auth-form button[type=submit]').click();assert.match(await page.locator('#account-feedback').textContent(),/先获取邮箱验证码/);
  await page.locator('#register-email').fill('reader@example.com');await page.locator('[data-account="send-code"]').click();await page.getByText(/验证码已发送，请查收邮箱/).waitFor();
  assert.equal(mail.length,1);assert.equal(await page.locator('[data-account="send-code"]').isDisabled(),true);
  assert.equal(await page.locator('#register-code').inputValue(),'');assert.ok(!(await page.locator('body').textContent()).includes(mail[0].code));
  await page.locator('#register-code').fill(mail[0].code==='000000'?'111111':'000000');await page.locator('#auth-form button[type=submit]').click();await page.getByText(/验证码不正确/).waitFor();assert.match(page.url(),/account.html/);
  // Password clears after an unsuccessful submission; other fields and code remain editable.
  await page.locator('#account-password').fill('12345678');await page.locator('#register-code').fill(mail[0].code);await page.locator('#auth-form button[type=submit]').click();await page.waitForURL(`${base}/capsule.html`);
  await page.locator('.rank-item').first().waitFor();assert.equal(await page.locator('.rank-item').count(),8);assert.equal(await page.evaluate(()=>window.MoyuAccount.current().emailVerified),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('moyu:accounts:v1')),null);
  assert.ok(!(await page.evaluate(()=>document.cookie)).includes('moyu_session'));
  await page.locator('#capsule-form button[type=submit]').click();assert.equal(await page.locator('.result-eyebrow').textContent(),'听雨的排序');assert.equal(await page.evaluate(()=>localStorage.getItem('moyu:activity:capsule-v1')),guest);
  await openAccount();await page.locator('#profile-name').fill('远山');
  await page.route('**/api/account',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'测试保存失败'})}));
  await page.locator('#profile-form button[type=submit]').click();await page.getByText('测试保存失败',{exact:true}).waitFor();assert.match(page.url(),/account.html/);assert.equal(await page.locator('#profile-name').inputValue(),'远山');await page.unroute('**/api/account');
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=50;c.height=80;c.getContext('2d').fillRect(0,0,50,80);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#avatar-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await page.getByText('预览已更新，点击保存资料后生效。',{exact:true}).waitFor();
  await page.locator('#profile-form button[type=submit]').click();await page.waitForURL(`${base}/capsule.html`);await page.locator('.result-eyebrow').waitFor();assert.equal(await page.locator('.result-eyebrow').textContent(),'远山的排序');assert.equal(await page.locator('[data-account-link] img').count(),1);
  await openAccount();assert.equal(await page.locator('#profile-name').inputValue(),'远山');assert.equal(await page.locator('#avatar-preview img').count(),1);
  await page.locator('[data-account="remove-avatar"]').click();await page.locator('#profile-form button[type=submit]').click();await page.waitForURL(`${base}/capsule.html`);await openAccount();assert.equal(await page.locator('#avatar-preview img').count(),0);
  await page.locator('[data-account="logout"]').click();await page.locator('#auth-form').waitFor();await page.locator('#account-handle').fill('中文账号');await page.locator('#account-password').fill('12345678');await page.locator('#auth-form button[type=submit]').click();await page.waitForURL(`${base}/capsule.html`);await page.locator('.result-eyebrow').waitFor();assert.equal(await page.locator('.result-eyebrow').textContent(),'远山的排序');
    const other=await browser.newContext();const fresh=await other.newPage();await fresh.goto(`${base}/account.html?returnTo=https://example.com`);await fresh.locator('#auth-form').waitFor();assert.equal(await fresh.locator('#account-return').getAttribute('href'),`${base}/index.html?accountReturn=1`);await fresh.locator('[data-mode="register"]').click();
  for(const width of [375,620,768,1440]){await fresh.setViewportSize({width,height:900});assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await fresh.setViewportSize({width:375,height:812});await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await fresh.screenshot({path:path.join(__dirname,'../test-results/email-registration-mobile.png'),fullPage:true});
  await fresh.locator('#register-email').fill('changed@example.com');await fresh.locator('[data-account="send-code"]').click();await fresh.getByText(/验证码已发送/).waitFor();await fresh.locator('#register-email').fill('different@example.com');
  await fresh.locator('#account-handle').fill('另一个');await fresh.locator('#account-name').fill('测试');await fresh.locator('#account-password').fill('abcdefgh');await fresh.locator('#account-consent').check();await fresh.locator('#register-code').fill(mail.at(-1).code);await fresh.locator('#auth-form button[type=submit]').click();assert.match(await fresh.locator('#account-feedback').textContent(),/先获取邮箱验证码/);
  await other.close();assert.deepEqual(errors,[]);
  console.log('PASS: real server code flow via injected test mail, no OTP leak, wrong code and email change rejected, 60s resend cooldown, registration auto-login/return, HttpOnly session, profile save immediate return, save-failure stays with edits, avatar update, logout/relogin, account/guest isolation, safe return URL and 4 mobile sizes. Real SMTP delivery still requires configuration.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});