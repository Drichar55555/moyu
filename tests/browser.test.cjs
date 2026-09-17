const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.MOYU_TEST_URL || 'http://127.0.0.1:4175';
const output = path.join(__dirname, '../test-results');

(async () => {
  await fs.mkdir(output, { recursive:true });
  const browser = await chromium.launch({headless:true, channel:'chromium'});
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error=>errors.push(error.message));
  page.on('response', response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  try {
    await page.goto(base);
    await page.locator('#intro').waitFor({state:'hidden'});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('h1').textContent(),'有一天，你的职业还在吗？');
    assert.equal(await page.locator('.brand-wordmark').first().textContent(),'墨愚');
    assert.equal(await page.locator('img[src="assets/logo.png"],img[src="assets/mark.png"]').count(),0);
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>getComputedStyle(el).fontFamily.includes('YuFan')&&!el.closest('.logo-type')).map(el=>el.tagName)),[]);
    await page.screenshot({path:path.join(output,'home-desktop.png'),fullPage:false});
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(output,'home-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('.event-cta a').click();
    await page.waitForURL('**/capsule.html');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.rank-item').count(),8);
    assert.equal(await page.locator('.rank-table').count(),0);
    await page.screenshot({path:path.join(output,'capsule-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'下移收银员',exact:true}).click();
    assert.equal(await page.locator('.rank-name strong').first().textContent(),'翻译');
    await page.locator('[data-job="translator"]').dragTo(page.locator('[data-job="driver"]'));
    assert.equal(await page.locator('.rank-name strong').nth(2).textContent(),'翻译');
    await page.locator('#capsule-email').fill('invalid-email');
    await page.locator('#capsule-form button[type=submit]').click();
    assert.match(await page.locator('#email-error').textContent(),/有效/);
    await page.locator('#capsule-email').fill('demo@example.com');
    await page.locator('#capsule-form button[type=submit]').click();
    assert.match(await page.locator('#consent-error').textContent(),/勾选同意/);
    await page.locator('#email-consent').check();
    await page.locator('#capsule-form button[type=submit]').click();
    assert.equal(await page.locator('.rank-table tbody tr').count(),8);
    assert.equal(await page.locator('.sample-person').count(),0);
    await page.reload();
    assert.equal(await page.locator('.rank-table tbody tr').count(),8);
    await page.locator('.result-settings summary').click();
    await page.locator('[data-action="remove-email"]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu:activity:capsule-v1')).email),null);
    await page.locator('[data-action="edit-capsule"]').click();
    await page.locator('#capsule-form button[type=submit]').click();
    assert.equal(await page.locator('.data-badge').first().textContent(),'Demo · 6 份模拟 + 你的 1 份排序');
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(output,'capsule-results-mobile.png'),fullPage:true});
    await page.locator('[data-action="edit-capsule"]').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'上移护理人员',exact:true}).click();
    assert.equal(await page.locator('[data-job="nurse"]').evaluate(el=>[...el.parentNode.children].indexOf(el)),6);
    await page.screenshot({path:path.join(output,'capsule-mobile.png'),fullPage:true});

    await page.goto(`${base}/generations.html`);
    await page.locator('[data-action="start-self"]').click();
    assert.match(await page.locator('#cohort-error').textContent(),/先选择/);
    await page.locator('input[value="young"]').check();
    await page.locator('[data-action="start-self"]').click();
    await page.locator('[data-action="advance"]').click();
    assert.match(await page.locator('#answer-error').textContent(),/请选择/);
    await page.locator('input[name=answer][value="0"]').check();
    await page.locator('[data-action="advance"]').click();
    await page.locator('[data-action="previous"]').click();
    assert.equal(await page.locator('input[name=answer][value="0"]').isChecked(),true);
    for(let i=0;i<4;i++) {
      await page.locator(`input[name=answer][value="${i}"]`).check();
      await page.locator('[data-action="advance"]').click();
    }
    assert.equal(await page.locator('.answer-summary').count(),4);
    const response=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu:activity:answers-v1')));
    assert.equal(response.cohort,'young');
    assert.equal(Object.keys(response.answers).length,4);
    await page.locator('[data-action="guess-after-self"]').click();
    for(let i=0;i<4;i++) {
      const label=await page.locator('.target-label strong').textContent();
      assert.notEqual(label,'10后、20后');
      assert.equal(await page.locator('.answer-reveal').count(),0);
      const answer=await page.evaluate(({i,label})=>{const D=window.MoyuActivities;const id=D.cohorts.find(c=>c.label===label).id;const counts=D.questions[i].seed[id];const modes=D.modes(counts);return i%2===0?modes[0]:counts.findIndex((_,n)=>!modes.includes(n));},{i,label});
      await page.locator(`input[name=answer][value="${answer}"]`).check();
      await page.locator('[data-action="advance"]').click();
      assert.equal(await page.locator('.answer-reveal').count(),1);
      assert.equal(await page.locator('input[name=answer]').first().isDisabled(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(i===0)await page.screenshot({path:path.join(output,'generations-reveal-mobile.png'),fullPage:true});
      await page.locator('[data-action="advance"]').click();
    }
    assert.equal(await page.locator('.quiz-score strong').textContent(),'2');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu:activity:answers-v1'))),response);
    await page.reload();
    assert.equal(await page.locator('input[value="young"]').isChecked(),true);
    await page.locator('input[value="older"]').check();
    await page.locator('[data-action="start-self"]').click();
    for(let i=0;i<4;i++){await page.locator('input[name=answer][value="0"]').check();await page.locator('[data-action="advance"]').click();}
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu:activity:answers-v1')).cohort),'older');
    await page.locator('[data-action="back-setup"]').click();
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(output,'generations-desktop.png'),fullPage:true});
    for(const route of ['index.html','capsule.html','generations.html','account.html']) {
      await page.goto(`${base}/${route}`);
      if(route==='index.html')await page.locator('#intro').waitFor({state:'hidden'});
      assert.equal(await page.locator('.brand-wordmark').first().textContent(),'墨愚');
      assert.equal(await page.locator('img[src="assets/logo.png"],img[src="assets/mark.png"]').count(),0);
      assert.match(await page.locator('link[rel="icon"]').getAttribute('href'),/moyu-wordmark\.svg$/);
      for(const width of [375,620,768,1024,1440]) {
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} overflow at ${width}`);
      }
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='error').length),0,`${route} font error`);
    }
    const blocked=await browser.newContext();
    await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError');};});
    const blockedPage=await blocked.newPage();
    await blockedPage.goto(`${base}/capsule.html`);
    await blockedPage.locator('#capsule-form button[type=submit]').click();
    assert.match(await blockedPage.locator('.result-storage-warning').textContent(),/仅本次会话/);
    await blocked.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: navigation, logo-only YuFan, font loading, real drag/buttons, form validation/consent, capsule persistence, deduplication, no-email submission, mobile reorder, required age, self-answer back/submit, other-cohort guesses, mode scoring, disabled revealed inputs, score review, cohort replacement, 15 responsive checks, blocked storage, zero page/resource errors.');
    console.log(`Screenshots: ${output}`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});