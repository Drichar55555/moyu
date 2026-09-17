const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.MOYU_TEST_URL || 'http://127.0.0.1:4175';

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chromium'});
  const owner=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await owner.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(`${base}/capsule.html`);
    await page.getByRole('button',{name:'上移护理人员',exact:true}).click();
    await page.locator('#capsule-email').fill('private@example.com');
    await page.locator('#email-consent').check();
    await page.locator('#capsule-form button[type=submit]').click();
    assert.equal(await page.locator('.career-bar').count(),8);
    const widths=await page.locator('.career-bar').evaluateAll(bars=>bars.map(b=>parseFloat(b.style.width)));
    assert.ok(widths.every((n,i)=>n>0 && n<=100 && (i===0 || n<=widths[i-1])));
    const data=await page.evaluate(()=>{
      const saved=JSON.parse(localStorage.getItem('moyu:activity:capsule-v1'));
      return {saved,expected:window.MoyuActivities.rankJobs([...window.MoyuActivities.seedOrders.map(p=>p.order),saved.order]).map(r=>(9-r.average)/8*100)};
    });
    widths.forEach((n,i)=>assert.ok(Math.abs(n-data.expected[i])<0.001));
    assert.equal(await page.locator('.rank-table').isVisible(),false);
    await page.locator('.chart-table-details summary').click();
    assert.equal(await page.locator('.rank-table').isVisible(),true);
    await page.locator('[data-action="share-result"]').first().click();
    const url=await page.locator('#result-share-url').inputValue();
    assert.match(new URL(url).searchParams.get('result'),/^v1\.[0-7]{8}$/);
    assert.equal(new URL(url).searchParams.get('author'),'匿名访客');
    assert.ok(!url.includes('private')&&!url.includes('email'));
    assert.match(await page.locator('.share-warning').textContent(),/无法打开/);
    await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.copied=text;}}});});
    await page.locator('[data-share="copy"]').click();
    assert.equal(await page.evaluate(()=>globalThis.copied),url);
    await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('blocked');}}});});
    await page.locator('[data-share="copy"]').click();
    assert.match(await page.locator('#share-feedback').textContent(),/链接已选中/);
    assert.equal(await page.locator('#result-share-url').evaluate(el=>el.selectionEnd-el.selectionStart),url.length);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.capsule-share-dialog').isVisible(),false);
    await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{globalThis.shared=data;}});});
    await page.locator('[data-action="wechat-share"]').click();
    await page.locator('[data-share="native"]').click();
    assert.equal((await page.evaluate(()=>globalThis.shared)).url,url);
    await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancelled','AbortError');}});});
    await page.locator('[data-share="native"]').click();
    assert.match(await page.locator('#share-feedback').textContent(),/已取消/);
    await page.keyboard.press('Escape');

    const recipient=await browser.newContext({viewport:{width:1440,height:1000}});
    const friend=await recipient.newPage();friend.on('pageerror',e=>errors.push(e.message));
    await friend.goto(url);
    assert.equal(await friend.locator('.shared-banner').textContent(),'匿名访客的排序');
    assert.equal(await friend.locator('#result-title').textContent(),'哪个职业会先消失？');
    assert.equal(await friend.locator('.personal-order li').count(),8);
    assert.equal(await friend.locator('.sample-person,.ranking-list,.result-columns aside').count(),0);
    assert.equal(await friend.locator('.event-heading').isVisible(),false);
    assert.equal(await friend.locator('h1:visible').count(),1);
    assert.equal(await friend.locator('.career-bar').count(),8);
    assert.equal(await friend.locator('[data-action="remove-email"]').count(),0);
    assert.equal(await friend.locator('[data-action="edit-capsule"]').count(),0);
    assert.ok(!(await friend.locator('body').textContent()).includes('private@example.com'));
    assert.equal(await friend.evaluate(()=>localStorage.getItem('moyu:activity:capsule-v1')),null);
    const sharedOrder=await friend.locator('.receipt-order').innerText();
    await friend.reload();
    assert.equal(await friend.locator('.receipt-order').innerText(),sharedOrder);
    const out=path.join(__dirname,'../test-results');await fs.mkdir(out,{recursive:true});
    await friend.screenshot({path:path.join(out,'shared-result-desktop.png'),fullPage:true});
    for(const width of [375,620,768,1024,1440]){await friend.setViewportSize({width,height:900});assert.equal(await friend.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
    await friend.setViewportSize({width:375,height:812});
    await friend.evaluate(()=>scrollTo(0,0));
    const hierarchy=await friend.evaluate(()=>({
      orderBottom:document.querySelector('.personal-order').getBoundingClientRect().bottom,
      chartTop:document.querySelector('.result-community').getBoundingClientRect().top,
      personalSize:parseFloat(getComputedStyle(document.querySelector('.personal-order strong')).fontSize),
      chartSize:parseFloat(getComputedStyle(document.querySelector('.career-label strong')).fontSize),
      actionBottom:document.querySelector('.result-primary-actions').getBoundingClientRect().bottom
    }));
    assert.ok(hierarchy.orderBottom<812,'Complete personal order fits first mobile screen');
    assert.ok(hierarchy.actionBottom<812,'Participation is visible without scrolling');
    assert.ok(hierarchy.chartTop>hierarchy.orderBottom,'Community chart follows personal result');
    assert.ok(hierarchy.personalSize>=25 && hierarchy.personalSize>hierarchy.chartSize*1.5,'Personal order has strongest type hierarchy');
    await friend.screenshot({path:path.join(out,'shared-result-mobile.png'),fullPage:true});
    await friend.locator('[data-action="share-result"]').first().click();
    assert.equal(await friend.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await friend.screenshot({path:path.join(out,'share-dialog-mobile.png')});
    await friend.keyboard.press('Escape');
    await friend.locator('[data-action="participate"]').first().click();
    assert.equal(await friend.locator('.rank-item').count(),8);
    assert.equal(await friend.locator('.event-heading').isVisible(),true);
    assert.equal(new URL(friend.url()).searchParams.has('result'),false);
    await friend.reload();assert.equal(await friend.locator('.rank-item').count(),8);
    await friend.goBack();assert.equal(await friend.locator('.shared-banner').count(),1);
    await friend.goForward();assert.equal(await friend.locator('.rank-item').count(),8);
    await friend.locator('#capsule-form button[type=submit]').click();
    assert.equal(await friend.locator('.shared-banner').count(),0);
    const before=await friend.evaluate(()=>localStorage.getItem('moyu:activity:capsule-v1'));
    await friend.goto(url);
    assert.equal(await friend.locator('.receipt-order').innerText(),sharedOrder);
    assert.equal(await friend.evaluate(()=>localStorage.getItem('moyu:activity:capsule-v1')),before);
    await friend.goto(`${base}/capsule.html?result=v1.00000000`);
    assert.equal(await friend.locator('.invalid-result').count(),1);
    assert.equal(await friend.evaluate(()=>localStorage.getItem('moyu:activity:capsule-v1')),before);
    await friend.locator('[data-action="participate"]').click();assert.equal(await friend.locator('.rank-item').count(),8);
    await friend.goto(`${base}/capsule.html?result=v1.01234567&result=v1.76543210`);
    assert.equal(await friend.locator('.invalid-result').count(),1);
    assert.deepEqual(errors,[]);
    console.log('PASS: bar values/order, accessible table, versioned private-data-free URL, clipboard success/fallback, native-share/cancel handling, local URL warning, fresh recipient + refresh, existing record isolation, participate/back/forward, malformed/duplicate tokens, 5 widths and mobile share dialog. Native share is mocked, not a real WeChat delivery test.');
    await recipient.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});