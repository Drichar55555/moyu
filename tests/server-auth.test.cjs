const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createMoyuServer}=require('../server.cjs');
async function fixture(sendMail,clock){const server=createMoyuServer({dbPath:':memory:',sendMail,now:()=>clock.value});server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;return {server,origin,async post(route,data,headers={}){const res=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(data)});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')};}};}
(async()=>{
 const clock={value:Date.now()},mail=[];
 const f=await fixture(async message=>mail.push(message),clock);
 try{
  const send=await f.post('/api/auth/code',{email:'test@example.com'});assert.equal(send.status,200);assert.equal(mail.length,1);assert.ok(!('code' in send.body));assert.match(mail[0].code,/^\d{6}$/);
  assert.equal((await f.post('/api/auth/code',{email:'test@example.com'})).status,429);
  const request={handle:'中文账号',name:'听雨',password:'12345678',email:'test@example.com',challengeId:send.body.challengeId,code:mail[0].code};
  assert.equal((await f.post('/api/auth/register',{...request,email:'other@example.com'})).status,400);
  assert.equal((await f.post('/api/auth/register',{...request,code:mail[0].code==='000000'?'111111':'000000'})).status,400);
  const result=await f.post('/api/auth/register',request);assert.equal(result.status,201);assert.equal(result.body.user.emailVerified,true);assert.match(result.cookie,/HttpOnly/);assert.match(result.cookie,/SameSite=Lax/);assert.ok(!('password_hash' in result.body.user));
  const cookie=result.cookie.split(';')[0];
  const session=await (await fetch(f.origin+'/api/auth/session',{headers:{Cookie:cookie}})).json();assert.equal(session.user.name,'听雨');
  assert.equal((await f.post('/api/auth/register',{...request,handle:'重放'})).status,400);
  assert.equal((await f.post('/api/auth/login',{handle:request.handle,password:'wrong'})).status,401);
  assert.equal((await f.post('/api/auth/login',{handle:request.handle,password:'12345678'},{Origin:'https://evil.example'})).status,403);
  const profile=await fetch(f.origin+'/api/account',{method:'PATCH',headers:{Origin:f.origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({name:'远山',avatar:'',tone:'moss'})});assert.equal(profile.status,200);
  const denied=await fetch(f.origin+'/api/account',{method:'PATCH',headers:{Origin:f.origin,'Content-Type':'application/json'},body:JSON.stringify({name:'冒名',avatar:'',tone:'moss'})});assert.equal(denied.status,401);
  await f.post('/api/auth/logout',{}, {Cookie:cookie});assert.equal((await (await fetch(f.origin+'/api/auth/session',{headers:{Cookie:cookie}})).json()).user,null);
  for(const route of ['/.env','/.data/moyu.sqlite','/server.cjs','/tests/server-auth.test.cjs'])assert.equal((await fetch(f.origin+route)).status,404);
  const expires=await f.post('/api/auth/code',{email:'expired@example.com'});clock.value+=600001;
  assert.equal((await f.post('/api/auth/register',{...request,handle:'过期',email:'expired@example.com',challengeId:expires.body.challengeId,code:mail.at(-1).code})).status,400);
  const attempts=await f.post('/api/auth/code',{email:'attempts@example.com'}),attemptCode=mail.at(-1).code;
  for(let i=0;i<5;i++)assert.equal((await f.post('/api/auth/register',{...request,handle:'错误次数',email:'attempts@example.com',challengeId:attempts.body.challengeId,code:attemptCode==='000000'?'111111':'000000'})).status,400);
  assert.equal((await f.post('/api/auth/register',{...request,handle:'错误次数',email:'attempts@example.com',challengeId:attempts.body.challengeId,code:attemptCode})).status,400);
  const first=await f.post('/api/auth/code',{email:'resend@example.com'}),oldCode=mail.at(-1).code;clock.value+=60001;
  const second=await f.post('/api/auth/code',{email:'resend@example.com'});assert.equal(second.status,200);
  assert.equal((await f.post('/api/auth/register',{...request,handle:'旧码',email:'resend@example.com',challengeId:first.body.challengeId,code:oldCode})).status,400);
  assert.equal((await f.post('/api/auth/register',{...request,handle:'新码',email:'resend@example.com',challengeId:second.body.challengeId,code:mail.at(-1).code})).status,201);
 }finally{await new Promise(r=>f.server.close(r));}
 const absent=await fixture(null,clock);try{assert.equal((await absent.post('/api/auth/code',{email:'test@example.com'})).status,503);}finally{await new Promise(r=>absent.server.close(r));}
 const failed=await fixture(async()=>{throw new Error('mail transport failed');},clock);try{const res=await failed.post('/api/auth/code',{email:'test@example.com'});assert.equal(res.status,502);assert.ok(!res.body.challengeId);}finally{await new Promise(r=>failed.server.close(r));}
 console.log('PASS: server email binding, expiry, 5-attempt lockout, resend invalidation, one-time registration, auto-session, cookie flags, auth required, CSRF origin, rate limit, private files blocked, SMTP-unconfigured and send-failure errors. Mail transport is injected for tests, no real email was sent.');
})().catch(e=>{console.error(e);process.exitCode=1;});