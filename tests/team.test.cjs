'use strict';
const assert=require('node:assert/strict');
const {once}=require('node:events');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const {createMoyuServer}=require('../server.cjs');
const profiles=require('../team-data.js');

const members=[
  {role:'CEO',name:'王大溪'},
  {role:'COO',name:'肖景妍'},
  {role:'信息技术总监',name:'张润铖'},
  {role:'人事总监',name:'瞿伊辰'},
  {role:'行政总管',name:'徐想'},
  {role:'艺术总监',name:'高天一'},
  {role:'产品经理',name:'吴允赫'}
];

(async()=>{
  const server=createMoyuServer({dbPath:':memory:',sendMail:null,paymentProviders:{},enabledCourseIds:[]});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try{
    browser=await chromium.launch({channel:'chromium',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
    const errors=[],badResponses=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)badResponses.push(response.url());});
    await page.goto(base);
    await page.locator('#intro').waitFor({state:'hidden'});
    await page.locator('#about #reading-list').click();
    assert.equal(await page.locator('#reading-list-dialog').isVisible(),true,'existing about action remains functional');
    await page.keyboard.press('Escape');
    await page.locator('#about a[href="team.html"]').click();
    await page.waitForURL('**/team.html');
    assert.equal(await page.title(),'公司架构 — 墨愚');
    assert.equal(await page.locator('h1').textContent(),'公司架构');
    assert.equal(await page.locator('.member-card').count(),7);
    assert.equal(await page.locator('.member-link').count(),7);
    assert.deepEqual(profiles.map(({role,name})=>({role,name})),members);
    assert.equal(new Set(profiles.map(member=>member.id)).size,7);
    assert.equal(new Set(profiles.map(member=>member.motto)).size,7);
    assert.deepEqual(await page.locator('.member-card').evaluateAll(cards=>cards.map(card=>({
      role:card.querySelector('.member-role').textContent,name:card.querySelector('.member-name').textContent
    }))),members);
    for(const [index,member] of members.entries()){
      const avatar=page.locator('.member-card').nth(index).locator('img');
      assert.equal(await avatar.getAttribute('src'),profiles[index].portrait||'assets/team/avatar-placeholder.svg');
      assert.equal(await avatar.getAttribute('alt'),profiles[index].portrait?member.name:`${member.name}的头像预留位置`);
      await page.waitForFunction(image=>image.complete&&image.naturalWidth>0,await avatar.elementHandle());
      const link=page.locator('.member-link').nth(index);
      assert.equal(await link.getAttribute('href'),`member.html?id=${profiles[index].id}`);
      if(index===0){
        await link.focus();await page.keyboard.press('Enter');
      }else{
        await link.click();
      }
      await page.waitForURL(`${base}/member.html?id=${profiles[index].id}`);
      assert.equal(await page.title(),`${member.name} — 墨愚`);
      assert.equal(await page.locator('#profile-name').textContent(),member.name);
      assert.equal(await page.locator('#profile-role').textContent(),member.role);
      assert.equal(await page.locator('#profile-motto').textContent(),profiles[index].motto);
      assert.equal(await page.locator('#profile-experience').textContent(),profiles[index].experience);
      assert.equal(await page.locator('#profile-example').isVisible(),true);
      assert.equal(await page.locator('.member-biography > p').count(),3);
      assert.equal(await page.locator('#member-profile h2,#member-profile h3').count(),0);
      assert.equal(await page.locator('#profile-name').isVisible(),true);
      await page.waitForFunction(()=>document.querySelector('#profile-image').complete&&document.querySelector('#profile-image').naturalWidth>0);
      const quote=await page.locator('#profile-motto').boundingBox(),experience=await page.locator('#profile-experience').boundingBox();
      assert.ok(experience.y-quote.y-quote.height>=24,'experience follows the motto with one paragraph of whitespace');
      assert.doesNotMatch(await page.locator('#member-profile').innerText(),/理念|过往经历/);
      await page.reload();assert.equal(await page.locator('#profile-motto').textContent(),profiles[index].motto);
      await page.locator('#member-return').click();
      await page.waitForURL(`${base}/team.html#member-${profiles[index].id}`);
    }
    for(const width of [320,375,620,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`team overflow at ${width}`);
      const portraits=await page.locator('.member-portrait').evaluateAll(elements=>elements.map(element=>{
        const box=element.getBoundingClientRect();return {width:box.width,height:box.height};
      }));
      portraits.forEach(box=>assert.ok(Math.abs(box.width-box.height)<1,'avatar slots remain square before circular clipping'));
    }
    const out=path.join(__dirname,'../test-results');await fs.mkdir(out,{recursive:true});
    await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>document.fonts.ready);
    await page.emulateMedia({reducedMotion:'no-preference'});
    const first=page.locator('.member-link').first();
    await page.mouse.move(0,0);
    const beforeHover=await first.evaluate(element=>{
      const box=element.getBoundingClientRect(),style=getComputedStyle(element);
      return {width:box.width,height:box.height,background:style.backgroundColor,border:style.borderBottomColor,
        children:[...element.children].map(child=>{
          const rect=child.getBoundingClientRect();
          return {width:rect.width,height:rect.height,cx:rect.x+rect.width/2,cy:rect.y+rect.height/2};
        })};
    });
    await first.hover();
    await page.waitForFunction(element=>[...element.children].every(child=>new DOMMatrix(getComputedStyle(child).transform).a>=1.059),await first.elementHandle());
    const afterHover=await first.evaluate(element=>{
      const box=element.getBoundingClientRect(),style=getComputedStyle(element);
      return {width:box.width,height:box.height,background:style.backgroundColor,border:style.borderBottomColor,transform:style.transform,
        children:[...element.children].map(child=>{
          const rect=child.getBoundingClientRect(),matrix=new DOMMatrix(getComputedStyle(child).transform);
          return {width:rect.width,height:rect.height,cx:rect.x+rect.width/2,cy:rect.y+rect.height/2,scaleX:matrix.a,scaleY:matrix.d};
        })};
    });
    assert.equal(afterHover.transform,'none','the card itself must not scale');
    for(const key of ['width','height','background','border'])assert.equal(afterHover[key],beforeHover[key],`card ${key} stays unchanged on hover`);
    afterHover.children.forEach((child,index)=>{
      assert.ok(Math.abs(child.scaleX-1.06)<.002&&Math.abs(child.scaleY-1.06)<.002,'avatar, role and name scale independently and proportionally');
      assert.ok(Math.abs(child.cx-beforeHover.children[index].cx)<1&&Math.abs(child.cy-beforeHover.children[index].cy)<1,'each element keeps its own center');
    });
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await first.evaluate(element=>[...element.children].every(child=>getComputedStyle(child).transform==='none')),true,'reduced motion disables all child enlargement');
    await first.focus();
    assert.notEqual(await first.evaluate(element=>getComputedStyle(element).outlineStyle),'none');
    await page.screenshot({path:path.join(out,'team-desktop.png'),fullPage:true});
    await page.setViewportSize({width:375,height:812});
    await page.screenshot({path:path.join(out,'team-mobile.png'),fullPage:true});
    await page.locator('[data-account-link]').click();
    await page.locator('#auth-form').waitFor();
    assert.equal(await page.locator('#account-return').getAttribute('href'),`${base}/team.html#member-${profiles.at(-1).id}`);
    await page.locator('#account-return').click();await page.locator('.member-card').first().waitFor();
    await page.goto(`${base}/account.html?returnTo=${encodeURIComponent('member.html?id=zhang-runcheng')}`);
    await page.locator('#auth-form').waitFor();
    assert.equal(await page.locator('#account-return').getAttribute('href'),`${base}/member.html?id=zhang-runcheng`);
    await page.locator('#account-return').click();await page.locator('#member-profile').waitFor();
    for(const [width,height,stacked] of [[320,900,true],[393,852,true],[620,900,true],[768,1024,true],[1024,1366,true],[1183,768,false],[1440,1000,false],[852,393,false]]){
      await page.setViewportSize({width,height});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`member profile overflow at ${width}`);
      const layout=await page.evaluate(()=>{
        const box=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
        return {photo:box('.member-visual'),name:box('#profile-name'),quote:box('#profile-motto'),experience:box('#profile-experience'),article:box('#member-profile'),
          mode:getComputedStyle(document.querySelector('.member-visual')).position,color:getComputedStyle(document.querySelector('#profile-motto')).color};
      });
      assert.equal(layout.mode,stacked?'relative':'absolute',`aspect-ratio layout at ${width}×${height}`);
      if(stacked){
        assert.ok(layout.quote.top>=layout.photo.bottom+24,'mobile text must sit below the photo');
        assert.ok(layout.name.bottom<=layout.photo.bottom,'mobile name overlays the bottom of the photo');
        assert.equal(layout.color,'rgb(17, 17, 17)');
      }else{
        assert.ok(layout.photo.height>=height,'desktop image fills at least the viewport');
        assert.equal(layout.color,'rgb(255, 255, 255)');
      }
      assert.ok(layout.experience.bottom<=layout.article.bottom,'text must never be clipped on short screens');
    }
    await page.goto(`${base}/member.html?id=wang-daxi`);
    await page.setViewportSize({width:1183,height:768});await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>document.querySelector('#profile-image').complete&&document.querySelector('#profile-image').naturalWidth===633);
    await page.screenshot({path:path.join(out,'member-desktop.png'),fullPage:true});
    await page.setViewportSize({width:393,height:852});
    await page.waitForFunction(()=>document.querySelector('#profile-image').complete&&document.querySelector('#profile-image').naturalHeight===718);
    const hero=await page.locator('.member-visual').boundingBox();
    assert.ok(Math.abs(hero.height-301)<=1,'phone photo matches the supplied 393×301 hero');
    assert.match(await page.locator('#profile-image').evaluate(image=>image.currentSrc),/wang-daxi-mobile\.jpg$/);
    await page.screenshot({path:path.join(out,'member-mobile.png'),fullPage:true});
    for(const query of ['','id=unknown','id=','id=wang-daxi&id=xiao-jingyan','id=%3Cscript%3E']){
      await page.goto(`${base}/member.html?${query}`);
      assert.equal(await page.locator('#member-error').isVisible(),true);
      assert.equal(await page.locator('#member-profile').isVisible(),false);
    }
    await page.goto(`${base}/team.html`);
    await page.locator('.team-header nav a[href="index.html#about"]').click();
    await page.waitForURL('**/index.html#about');
    await page.locator('#intro').waitFor({state:'hidden'});
    await page.locator('#about a[href="team.html"]').click();
    await page.waitForURL('**/team.html');await page.reload();
    assert.equal(await page.locator('.member-card').count(),7);
    assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
    const noJS=await browser.newContext({javaScriptEnabled:false});
    const staticPage=await noJS.newPage();await staticPage.goto(`${base}/team.html`);
    assert.equal(await staticPage.locator('.member-card').count(),7,'team information does not require JavaScript');
    assert.equal(await staticPage.locator('.member-link').count(),7,'navigation remains native links');
    await staticPage.goto(`${base}/member.html?id=wang-daxi`);
    assert.equal(await staticPage.locator('noscript').isVisible(),true);
    await noJS.close();
    console.log('PASS: about entry, seven members and avatar slots, seven linked profiles, independent avatar/text scaling with fixed card geometry/background/border, reduced motion, keyboard focus, title-free motto/experience layout, example labeling, invalid links, reload/account returns, mobile layouts and no-JS handling.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
