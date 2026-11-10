'use strict';
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {mkdtemp,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {createMoyuServer}=require('../server.cjs');
const {failure}=require('../payment-providers.cjs');
const courses=require('../course-data.js');

(async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'moyu-payments-'));
  const dbPath=path.join(dir,'orders.sqlite');
  const clock={value:Date.now()},states=new Map(),created=[],mails=[];
  let failCreate=false,holdCreate=null,failQuery=false,failClose=false,server,origin;
  function provider(name){
    return {
      async create(order){
        created.push({...order,provider:name});
        if(holdCreate)await holdCreate;
        if(failCreate)throw failure(502,'测试支付超时，请查询订单。');
        states.set(order.id,{orderId:order.id,transactionId:`tx-${order.id}`,amountCents:order.amountCents,state:'pending'});
        return name==='wechat'?'weixin://wxpay/bizpayurl?pr=test':'https://qr.alipay.com/test';
      },
      async query(order){if(failQuery)throw failure(502,'测试查询失败。');return states.get(order.id)||null;},
      async close(order){if(failClose)throw failure(502,'测试关单失败。');const state=states.get(order.id);if(state)state.state='closed';},
      notify(raw,headers){
        if(headers['x-test-signature']!=='injected-test-only')throw failure(400,'测试签名无效。');
        return JSON.parse(raw);
      }
    };
  }
  const providers={wechat:provider('wechat'),alipay:provider('alipay')};
  async function start(paymentProviders=providers,enabledCourseIds=['honglou-close-reading']){
    server=createMoyuServer({dbPath,sendMail:async message=>mails.push(message),paymentProviders,enabledCourseIds,now:()=>clock.value});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    origin=`http://127.0.0.1:${server.address().port}`;
  }
  async function stop(){await new Promise(resolve=>server.close(resolve));}
  async function api(route,{cookie,method='GET',data,headers={}}={}){
    const response=await fetch(origin+route,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
    const text=await response.text();
    return {status:response.status,body:text?JSON.parse(text):null,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  async function account(index){
    const email=`payment${index}@example.com`;
    const code=await api('/api/auth/code',{method:'POST',data:{email}});
    const registered=await api('/api/auth/register',{method:'POST',data:{email,handle:`payment${index}`,name:`读者${index}`,password:'12345678',challengeId:code.body.challengeId,code:mails.at(-1).code}});
    assert.equal(registered.status,201);return registered.cookie;
  }
  async function notify(name,state,headers={}){
    const response=await fetch(`${origin}/api/payments/notify/${name}`,{method:'POST',headers:{'Content-Type':name==='wechat'?'application/json':'application/x-www-form-urlencoded','x-test-signature':'injected-test-only',...headers},body:JSON.stringify(state)});
    return {status:response.status,text:await response.text()};
  }
  try{
    await start();
    const user=await account(1),other=await account(2);
    const input={courseId:'honglou-close-reading',provider:'wechat'};
    assert.equal((await api('/api/orders',{method:'POST',data:input})).status,401);
    assert.equal((await api('/api/orders',{cookie:user,method:'POST',data:input,headers:{Origin:'https://evil.example'}})).status,403);
    assert.equal((await api('/api/orders',{cookie:user,method:'POST',data:{...input,amount:1}})).status,400);
    assert.equal((await api('/api/orders',{cookie:user,method:'POST',data:{...input,provider:'other'}})).status,400);
    assert.equal((await api('/api/orders',{cookie:user,method:'POST',data:{...input,courseId:'thinking-demo'}})).status,409);
    let order=(await api('/api/orders',{cookie:user,method:'POST',data:input})).body.order;
    assert.equal(order.amountCents,360000);
    assert.match(order.qrDataURL,/^data:image\/png;base64,/);
    assert.equal(created.length,1);
    const again=await api('/api/orders',{cookie:user,method:'POST',data:input});
    assert.equal(again.body.order.id,order.id);assert.equal(created.length,1);
    assert.equal((await api('/api/orders',{cookie:user,method:'POST',data:{...input,provider:'alipay'}})).status,409);
    assert.equal((await api(`/api/orders/${order.id}`,{cookie:other})).status,404);
    assert.equal((await api(`/api/orders/${order.id}/close`,{cookie:other,method:'POST',data:{}})).status,404);
    const paid={...states.get(order.id),state:'paid'};
    assert.equal((await notify('wechat',paid,{'x-test-signature':'wrong'})).status,400);
    assert.equal((await notify('wechat',{...paid,amountCents:1})).status,400);
    assert.equal((await notify('alipay',paid)).status,400);
    assert.equal((await api('/api/purchases',{cookie:user})).body.purchases.length,0);
    assert.equal((await notify('wechat',paid)).status,204);
    assert.equal((await notify('wechat',paid)).status,204,'duplicate notification is idempotent');
    assert.equal((await notify('wechat',{...paid,state:'closed'})).status,204);
    const confirmed=(await api(`/api/orders/${order.id}`,{cookie:user})).body.order;
    assert.equal(confirmed.status,'paid');assert.equal(confirmed.qrDataURL,undefined);
    assert.equal((await api('/api/purchases',{cookie:user})).body.purchases.length,1);
    assert.equal((await api('/api/purchases',{cookie:other})).body.purchases.length,0);
    assert.equal((await api('/api/orders',{cookie:user,method:'POST',data:input})).status,409,'owned course cannot be purchased twice');
    await stop();await start();
    assert.equal((await api(`/api/orders/${order.id}`,{cookie:user})).body.order.status,'paid','order persists after restart');
    assert.equal((await api('/api/purchases',{cookie:user})).body.purchases.length,1);

    order=(await api('/api/orders',{cookie:other,method:'POST',data:{...input,provider:'alipay'}})).body.order;
    failClose=true;
    assert.equal((await api(`/api/orders/${order.id}/close`,{cookie:other,method:'POST',data:{}})).status,502);
    failClose=false;
    const closed=await api(`/api/orders/${order.id}/close`,{cookie:other,method:'POST',data:{}});
    assert.equal(closed.body.order.status,'closed');
    order=(await api('/api/orders',{cookie:other,method:'POST',data:input})).body.order;
    clock.value+=900001;
    assert.equal((await api(`/api/orders/${order.id}`,{cookie:other})).body.order.status,'closed');
    assert.equal((await api('/api/purchases',{cookie:other})).body.purchases.length,0,'local expiry never grants purchase');

    failCreate=true;
    const failed=await api('/api/orders',{cookie:other,method:'POST',data:input});
    assert.equal(failed.status,502);
    const pending=(await api('/api/orders',{cookie:other})).body.orders.find(item=>item.status==='pending');
    failCreate=false;
    order=(await api('/api/orders',{cookie:other,method:'POST',data:input})).body.order;
    assert.equal(order.id,pending.id,'uncertain creation must reuse persisted order ID');
    const ownState=states.get(order.id);
    states.set(order.id,{...paid});
    clock.value+=6000;
    assert.equal((await api(`/api/orders/${order.id}`,{cookie:other})).status,400,'signed query result must match the requested order');
    states.set(order.id,ownState);
    failQuery=true;clock.value+=6000;
    assert.equal((await api(`/api/orders/${order.id}`,{cookie:other})).status,502);
    failQuery=false;
    states.set(order.id,{...states.get(order.id),state:'paid'});
    assert.equal((await api(`/api/orders/${order.id}`,{cookie:other})).body.order.status,'paid','provider query compensates missing notification');
    assert.equal((await api('/api/purchases',{cookie:other})).body.purchases.length,1);

    const third=await account(3);
    let release;holdCreate=new Promise(resolve=>{release=resolve;});
    const creating=api('/api/orders',{cookie:third,method:'POST',data:input});
    while(!created.some(item=>!states.has(item.id)&&item.id!==pending.id))await new Promise(resolve=>setTimeout(resolve,5));
    const concurrent=await api('/api/orders',{cookie:third,method:'POST',data:input});
    assert.equal(concurrent.status,409);
    release();holdCreate=null;
    order=(await creating).body.order;
    const conflicting={...states.get(order.id),state:'paid',transactionId:paid.transactionId};
    assert.equal((await notify('wechat',conflicting)).status,500,'a provider transaction cannot settle two orders');
    assert.equal((await api('/api/purchases',{cookie:third})).body.purchases.length,0);
    const settled={...states.get(order.id),state:'paid'};
    assert.equal((await notify('wechat',settled)).status,204);
    assert.equal((await api('/api/purchases',{cookie:third})).body.purchases.length,1);

    for(const route of ['/payments.cjs','/payment-providers.cjs','/.data/orders.sqlite','/.env','/node_modules/alipay-sdk/package.json']){
      assert.equal((await api(route)).status,404);
    }
    await stop();await start({},[]);
    const fourth=await account(4);
    const configuration=(await api('/api/payments/config?courseId=honglou-close-reading')).body;
    assert.deepEqual(configuration.methods,[{id:'wechat',available:false},{id:'alipay',available:false}]);
    assert.equal(configuration.purchasable,false);
    assert.equal((await api('/api/orders',{cookie:fourth,method:'POST',data:input})).status,503);
    assert.equal((await api('/api/orders',{cookie:fourth})).body.orders.length,0);
    assert.equal((await notify('wechat',paid)).status,503);
    assert.equal(courses[0].priceCents,360000);
    console.log('PASS: server-only pricing, login/ownership/CSRF, per-course gate, persistent orders and purchases, duplicate/concurrent creation, uncertain retries, callbacks and amount checks, idempotency, transaction uniqueness, query compensation, close/expiry, fail-closed unconfigured providers.');
  }finally{
    if(server?.listening)await stop();
    await rm(dir,{recursive:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
