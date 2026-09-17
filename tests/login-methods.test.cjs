const assert=require('node:assert/strict');
const {once}=require('node:events');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createMoyuServer}=require('../server.cjs');
(async()=>{
 let time=Date.now();const mail=[];
 const server=createMoyuServer({dbPath:':memory:',sendMail:async message=>mail.push(message),now:()=>time});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 async function post(route,data){const r=await fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};}
 async function code(email,purpose){time+=60001;const result=await post('/api/auth/code',{email,purpose});assert.equal(result.status,200);return {email,challengeId:result.body.challengeId,code:mail.at(-1).code};}
 const browser=await chromium.launch({channel:'chromium',headless:true});
 try{
  const rcode=await code('reader@example.com','register');
  assert.equal((await post('/api/auth/login-code',rcode)).status,400,'registration code cannot log in');
  const registration=await post('/api/auth/register',{...rcode,handle:'读者账号',name:'林间',password:'12345678'});assert.equal(registration.status,201);const id=registration.body.user.id;
  for(const identifier of ['reader@example.com','READER@EXAMPLE.COM','读者账号','林间']){const r=await post('/api/auth/login',{identifier,password:'12345678'});assert.equal(r.status,200);assert.equal(r.body.user.id,id);}
  assert.equal((await post('/api/auth/login',{identifier:'reader',password:'12345678'})).status,401,'email local-part is not sufficient');
  assert.equal((await post('/api/auth/login',{identifier:'reader@example.com',password:'wrong'})).status,401);
  const login=await code('reader@example.com','login');assert.equal(mail.at(-1).purpose,'login');
  assert.equal((await post('/api/auth/register',{...login,handle:'新账号',name:'林间',password:'12345678'})).status,400,'login code cannot register');
  assert.equal((await post('/api/auth/login-code',{...login,email:'other@example.com'})).status,400);
  assert.equal((await post('/api/auth/login-code',{...login,code:login.code==='000000'?'111111':'000000'})).status,400);
  const logged=await post('/api/auth/login-code',login);assert.equal(logged.status,200);assert.equal(logged.body.user.id,id);assert.match(logged.cookie,/HttpOnly/);
  assert.equal((await post('/api/auth/login-code',login)).status,400,'single use');
  const expire=await code('reader@example.com','login');time+=600001;assert.equal((await post('/api/auth/login-code',expire)).status,400);
  const locked=await code('reader@example.com','login');for(let i=0;i<5;i++)assert.equal((await post('/api/auth/login-code',{...locked,code:locked.code==='000000'?'111111':'000000'})).status,400);assert.equal((await post('/api/auth/login-code',locked)).status,400);
  const count=mail.length;const unknown=await post('/api/auth/code',{email:'unknown@example.com',purpose:'login'});assert.equal(unknown.status,200);assert.equal(mail.length,count);assert.match(unknown.body.message,/如果该邮箱已注册/);assert.equal((await post('/api/auth/login-code',{email:'unknown@example.com',challengeId:unknown.body.challengeId,code:'123456'})).status,400);
  const duplicate=await code('duplicate@example.com','register');assert.equal((await post('/api/auth/register',{...duplicate,handle:'另一个账号',name:'林间',password:'abcdefgh'})).status,201);
  assert.equal((await post('/api/auth/login',{identifier:'林间',password:'12345678'})).status,409,'duplicate public name must not pick arbitrary user');
  assert.equal((await post('/api/auth/login',{identifier:'duplicate@example.com',password:'abcdefgh'})).status,200);
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/account.html?returnTo=%2Fgenerations.html`);await page.locator('[data-login-method="code"]').click();assert.equal(await page.locator('#account-password').count(),0);assert.equal(await page.locator('#account-handle').count(),0);
  await page.locator('#auth-form button[type=submit]').click();assert.match(await page.locator('#account-feedback').textContent(),/先获取邮箱验证码/);
  for(const width of [375,620,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:375,height:812});await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/email-login-mobile.png'),fullPage:true});
  time+=3600001;await page.locator('#register-email').fill('reader@example.com');await page.locator('[data-account="send-code"]').click();await page.getByText(/如果该邮箱已注册，登录验证码已发送/).waitFor();assert.equal(mail.at(-1).purpose,'login');assert.equal(await page.locator('[data-account="send-code"]').isDisabled(),true);
  await page.locator('#register-code').fill(mail.at(-1).code);await page.locator('#auth-form button[type=submit]').click();await page.waitForURL(`${base}/generations.html`);await page.locator('#activity-app .setup').waitFor();assert.equal(await page.evaluate(()=>window.MoyuAccount.current().id),id);
  await page.locator('[data-account-link]').click();await page.locator('[data-account="logout"]').click();await page.locator('#account-handle').fill('READER@EXAMPLE.COM');await page.locator('#account-password').fill('12345678');await page.locator('#auth-form button[type=submit]').click();await page.waitForURL(`${base}/generations.html`);
  await page.locator('[data-account-link]').click();await page.locator('[data-account="logout"]').click();await page.locator('#account-handle').fill('另一个账号');await page.locator('#account-password').fill('abcdefgh');await page.locator('#auth-form button[type=submit]').click();await page.waitForURL(`${base}/generations.html`);await page.locator('#activity-app .setup').waitFor();assert.equal(await page.evaluate(()=>window.MoyuAccount.current().handle),'另一个账号');
  await page.locator('[data-account-link]').click();await page.locator('[data-account="logout"]').click();await page.locator('[data-login-method="code"]').click();await page.locator('[data-mode="register"]').click();assert.equal(await page.locator('#account-password').count(),1);await page.locator('[data-mode="login"]').click();assert.equal(await page.locator('#account-password').count(),0);await page.locator('[data-login-method="password"]').click();assert.equal(await page.locator('#account-password').count(),1);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: email/handle/display-name password login, case normalization, ambiguity handling, code-purpose separation, binding/expiry/attempt lockout/single use, unknown-email no account creation, email-code UI, automatic return, method switching and mobile layout. Test mail only.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});