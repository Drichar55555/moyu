const assert=require('node:assert/strict');
const {once}=require('node:events');
const {chromium}=require('playwright');
const {createMoyuServer}=require('../server.cjs');

(async()=>{
  const server=createMoyuServer({dbPath:':memory:',sendMail:null,paymentProviders:{},enabledCourseIds:[]});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try{
    browser=await chromium.launch({channel:'chromium',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors=[],badResponses=[],writes=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)badResponses.push(response.url());});
    page.on('request',request=>{if(request.method()!=='GET')writes.push(request.url());if(!request.url().startsWith(base))external.push(request.url());});
    const money=cents=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'}).format(cents/100);
    async function checkConciseCopy(){
      const text=await page.locator('body').innerText();
      assert.doesNotMatch(text,/体验购买流程|保持好奇|允许未知|本页课程、价格与大纲|MOYU \/|示例课程|示例价|示例大纲|示例规划|课程预览|TAKEAWAYS|SYLLABUS|返回课程列表 ↑/);
      assert.equal(await page.locator('footer,.eyebrow,.course-card-badge,.course-card-enter').count(),0);
    }
    async function checkLayout(label){
      for(const width of [320,375,620,768,812,1024,1440]){
        await page.setViewportSize({width,height:width===812?375:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label} overflow at ${width}`);
      }
    }
    await page.goto(base);await page.locator('#intro').waitFor({state:'hidden'});await checkLayout('home');
    await page.locator('#main-nav a[href="courses.html"]').click();await page.waitForURL('**/courses.html');
    const courses=await page.evaluate(()=>window.MoyuCourses);
    const honglou=courses.find(course=>course.id==='honglou-close-reading');
    assert.ok(courses.length>=7);assert.equal(new Set(courses.map(course=>course.id)).size,courses.length);
    assert.equal(honglou.priceCents,360000);assert.equal(honglou.teacher.name,'卢家宁（老卢）');
    assert.deepEqual(honglou.delivery,{mode:'网络小班',lessonCount:36,minutesPerLesson:60});
    assert.deepEqual(honglou.lessons,[]);
    assert.equal(await page.locator('.course-card').count(),courses.length);
    await checkConciseCopy();await checkLayout('catalog');
    assert.equal(await page.locator('#course-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.locator('#course-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    await page.getByRole('button',{name:'写作表达',exact:true}).click();
    assert.equal(await page.locator('.course-card:visible').count(),1);
    await page.getByRole('button',{name:'全部',exact:true}).click();
    await page.locator('#course-search').fill('读懂一本书');assert.equal(await page.locator('.course-card:visible').count(),1);
    await page.locator('#course-search').fill('no-matching-course');assert.equal(await page.locator('#course-empty').isVisible(),true);
    await page.locator('#clear-course-filters').click();assert.equal(await page.locator('.course-card:visible').count(),courses.length);
    for(const course of courses){
      await page.goto(`${base}/courses.html`);
      const card=page.locator(`[data-course-id="${course.id}"]`);
      assert.equal(await card.locator('.course-card-title').textContent(),course.title);
      assert.equal(await card.locator('.course-card-subtitle').textContent(),course.subtitle);
      assert.equal(await card.locator('.course-card-price').textContent(),money(course.priceCents));
      await card.scrollIntoViewIfNeeded();const image=card.locator('img');
      await page.waitForFunction(img=>img.complete&&img.naturalWidth>0,await image.elementHandle());
      await card.click();await page.waitForURL(`${base}/course.html?id=${course.id}`);
      await checkConciseCopy();
      assert.equal(await page.locator('#course-title').textContent(),course.title);
      assert.equal(await page.locator('[data-course-checkout]').first().textContent(),'立即购买');
      const syllabus=course.outline||course.lessons;
      assert.equal(await page.locator('.course-lessons details').count(),syllabus.length);
      if(course.id===honglou.id){
        const text=await page.locator('[data-course-surface]').innerText();
        for(const fact of [/36 节 · 每节 60 分钟 · 网络小班/,/卢家宁（老卢）/,/6人成班，最多12人/,/14周岁以上/,/约第1—10回/])assert.match(text,fact);
        assert.doesNotMatch(text,/录播/);await checkLayout('honglou');
      }
      await page.locator('.course-lessons summary').nth(1).click();
      assert.equal(await page.locator('.course-lessons details').nth(1).getAttribute('open'),'');
      await page.locator('[data-course-checkout]').first().click();await page.waitForURL(`${base}/checkout.html?id=${course.id}`);
      await page.locator('#payment-feedback').filter({hasText:'登录后'}).waitFor();
      assert.equal(await page.locator('.checkout-total [data-course-price]').textContent(),money(course.priceCents));
      assert.equal(await page.locator('.checkout-submit').isDisabled(),true);
      assert.equal(await page.locator('#checkout-login').isVisible(),true);
      assert.equal(await page.locator('#complete-demo,#demo-consent,#demo-qr-code').count(),0);
      assert.equal(await page.locator('#payment-qr-image').isVisible(),false);
      await page.locator('[data-course-detail]').first().click();await page.waitForURL(`${base}/course.html?id=${course.id}`);
    }
    await page.goto(`${base}/checkout.html?id=${honglou.id}`);await checkLayout('checkout');
    await page.locator('[data-account-link]').click();await page.locator('#auth-form').waitFor();
    assert.equal(await page.locator('#account-return').getAttribute('href'),`${base}/checkout.html?id=${honglou.id}`);
    for(const route of ['course.html','checkout.html']){
      for(const query of ['id=missing','id=','id=thinking-demo&id=reading-demo']){
        await page.goto(`${base}/${route}?${query}`);
        assert.equal(await page.locator('#course-error').isVisible(),true);
        assert.equal(await page.locator('[data-course-surface]').isVisible(),false);
      }
      await page.goto(`${base}/${route}`);assert.equal(await page.locator('[data-course-title]').first().textContent(),courses[0].title);
    }
    await page.goto(`${base}/orders.html`);await page.locator('#orders-login').waitFor();await checkLayout('orders');
    assert.deepEqual(writes,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
    const noJS=await browser.newContext({javaScriptEnabled:false});
    const staticPage=await noJS.newPage();await staticPage.goto(`${base}/checkout.html`);
    assert.equal(await staticPage.locator('.checkout-submit').isDisabled(),true);await noJS.close();
    console.log('PASS: catalog, concise copy, source course facts, all course detail routes, responsive layout, authenticated checkout gate, unconfigured payment disabled, no fake payment controls, account returns and orders page.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
