'use strict';
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {chromium}=require('playwright');
const {createMoyuServer}=require('../server.cjs');
const {failure}=require('../payment-providers.cjs');

(async()=>{
  const states=new Map(),mail=[],clock={value:Date.now()};
  let failQuery=false;
  const provider=name=>({
    async create(order){
      states.set(order.id,{orderId:order.id,transactionId:`tx-${order.id}`,amountCents:order.amountCents,state:'pending'});
      return name==='wechat'?'weixin://wxpay/bizpayurl?pr=test':'https://qr.alipay.com/test';
    },
    async query(order){if(failQuery)throw failure(502,'支付平台查询暂不可用。');return states.get(order.id);},
    async close(order){states.get(order.id).state='closed';}
  });
  const server=createMoyuServer({dbPath:':memory:',sendMail:async message=>mail.push(message),now:()=>clock.value,
    paymentProviders:{wechat:provider('wechat'),alipay:provider('alipay')},enabledCourseIds:['honglou-close-reading']});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try{
    browser=await chromium.launch({channel:'chromium',headless:true});
    for(const [index,method] of ['wechat','alipay'].entries()){
      const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
      const email=`checkout${index}@example.com`;
      const options=data=>({data,headers:{Origin:base}});
      const sent=await context.request.post(base+'/api/auth/code',options({email}));
      const registered=await context.request.post(base+'/api/auth/register',options({
        handle:`checkout${index}`,name:'读者',password:'12345678',email,challengeId:(await sent.json()).challengeId,code:mail.at(-1).code
      }));
      assert.equal(registered.status(),201);
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/checkout.html?id=thinking-demo`);
      await page.locator('#payment-feedback').filter({hasText:'暂未开放购买'}).waitFor();
      assert.equal(await page.locator('.checkout-submit').isDisabled(),true);
      await page.goto(`${base}/checkout.html?id=honglou-close-reading`);
      await page.waitForFunction(()=>!document.querySelector('.checkout-submit').disabled);
      await page.locator(`input[value="${method}"]`).check();
      await page.locator('.checkout-submit').click();
      await page.locator('#checkout-qr').waitFor();
      assert.equal(await page.locator('#payment-qr-image').isVisible(),true);
      assert.match(await page.locator('#payment-qr-image').getAttribute('src'),/^data:image\/png;base64,/);
      assert.equal(await page.locator('#checkout-result').isVisible(),false);
      let id=new URL(page.url()).searchParams.get('order');assert.match(id,/^MY[a-f0-9]{30}$/);
      await page.reload();await page.locator('#checkout-qr').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('order'),id);
      failQuery=true;clock.value+=6000;
      await page.locator('#check-payment').click();
      await page.locator('#payment-feedback').filter({hasText:'查询暂不可用'}).waitFor();
      assert.equal(await page.locator('#checkout-result').isVisible(),false);
      failQuery=false;
      await page.locator('#close-payment').click();
      await page.locator('#checkout-content').waitFor();
      assert.equal(new URL(page.url()).searchParams.has('order'),false);
      await page.locator(`input[value="${method}"]`).check();await page.locator('.checkout-submit').click();
      await page.locator('#checkout-qr').waitFor();id=new URL(page.url()).searchParams.get('order');
      states.get(id).state='paid';clock.value+=6000;
      await page.locator('#check-payment').click();await page.locator('#checkout-result').waitFor();
      assert.equal(await page.locator('#result-title').textContent(),'支付成功');
      assert.equal(await page.locator('#result-order-id').textContent(),id);
      assert.match(await page.locator('#checkout-result').textContent(),/3,600\.00/);
      for(const width of [320,375,768,1440]){
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
      await page.getByRole('link',{name:'查看购买记录',exact:true}).click();
      await page.locator('.order-card').first().waitFor();
      assert.match(await page.locator('#orders-list').textContent(),/已支付/);
      await page.goto(`${base}/checkout.html?id=honglou-close-reading`);
      await page.locator('#payment-feedback').filter({hasText:'已购买'}).waitFor();
      assert.equal(await page.locator('.checkout-submit').isDisabled(),true);
      assert.deepEqual(errors,[]);
      await context.close();
    }
    const unavailable=createMoyuServer({dbPath:':memory:',sendMail:async message=>mail.push(message),paymentProviders:{},enabledCourseIds:[]});
    unavailable.listen(0,'127.0.0.1');await once(unavailable,'listening');
    try{
      const url=`http://127.0.0.1:${unavailable.address().port}`,context=await browser.newContext();
      const email='no-payment@example.com',options=data=>({data,headers:{Origin:url}});
      const sent=await context.request.post(url+'/api/auth/code',options({email}));
      await context.request.post(url+'/api/auth/register',options({handle:'nopayment',name:'读者',password:'12345678',email,challengeId:(await sent.json()).challengeId,code:mail.at(-1).code}));
      const page=await context.newPage();await page.goto(url+'/checkout.html?id=honglou-close-reading');
      await page.locator('#payment-feedback').filter({hasText:'支付暂未开通'}).waitFor();
      assert.equal(await page.locator('.checkout-submit').isDisabled(),true);
      assert.equal(await page.locator('input[name=payment]:disabled').count(),2);
      assert.equal(await page.locator('#payment-qr-image').isVisible(),false);
      await context.close();
    }finally{await new Promise(resolve=>unavailable.close(resolve));}
    console.log('PASS: both checkout methods, login, server QR display, reload recovery, query failure, confirmed cancellation, server-only paid result, purchase history, duplicate purchase guard, no-merchant disabled UI.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
