(async function () {
  'use strict';
  await window.MoyuAccount?.ready;
  const D = window.MoyuActivities;
  const app = document.querySelector('#activity-app');
  const status = document.querySelector('#activity-status');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const memory = new Map();
  const activityKey = key => window.MoyuAccount?.activityKey(key) || `moyu:activity:${key}`;
  const initialIdentity=window.MoyuAccount?.current()?.id || null;
  function checkIdentity(){if((window.MoyuAccount?.current()?.id||null)!==initialIdentity)location.reload();}
  window.addEventListener('pageshow',checkIdentity);
  window.addEventListener('moyu:account-change',checkIdentity);
  const store = {
    read(key) { key=activityKey(key); if (memory.has(key)) return memory.get(key); try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    save(key, value) { key=activityKey(key); memory.set(key,value); try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    remove(key) { key=activityKey(key); memory.delete(key); try { localStorage.removeItem(key); return true; } catch { return false; } }
  };
  const say = text => { status.textContent = text; };
  function focusStart() { const heading = app.querySelector('h1,h2,legend'); if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); heading.scrollIntoView({block:'start',behavior:'instant'}); } }
  const button = (action, text, secondary = false) => `<button type="button" class="button ${secondary ? 'button-outline' : 'button-dark'}" data-action="${action}">${text}</button>`;
  const jobName = id => D.jobs.find(job => job.id === id)?.name || '';
  const cohortName = id => D.cohorts.find(cohort => cohort.id === id)?.label || '';
  const steps = stage => `<ol class="steps" aria-label="活动进度"><li ${stage === 1 ? 'aria-current="step"' : ''}><b>01</b> 排出你的判断</li><li><b>02</b> 封存时光胶囊</li><li ${stage === 2 ? 'aria-current="step"' : ''}><b>03</b> 看见不同答案</li></ol>`;

  function capsuleActivity() {
    document.querySelector('.demo-notice p').textContent = '汇总榜含模拟数据；职业提醒邮件暂未启用。';
    const saved = store.read('capsule-v1');
    let capsule = saved && D.validOrder(saved.order) ? saved : null;
    let order = [...(capsule?.order || D.jobs.map(job => job.id))];
    let email = typeof capsule?.email === 'string' ? capsule.email : '';
    let consent = Boolean(email);
    let dragging = null;
    let persisted = true;
    let sharedOrder = null;
    let sharedName = '匿名访客';
    function ownerName() { return window.MoyuAccount?.current()?.name || '匿名访客'; }
    function safeName(value) { return window.MoyuAccount?.validName(value) ? value : '匿名访客'; }
    const shareDialog = document.createElement('dialog');
    shareDialog.className = 'capsule-share-dialog';
    shareDialog.setAttribute('aria-labelledby', 'share-title');
    document.body.append(shareDialog);
    function resultURL(resultOrder) {
      const url = new URL('capsule.html', location.href);
      url.searchParams.set('result', D.encodeResult(resultOrder));
      url.searchParams.set('author', sharedOrder ? sharedName : ownerName());
      return url.href;
    }
    function localOnlyURL() {
      const host = location.hostname;
      return location.protocol === 'file:' || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || /^127\./.test(host) || host === '[::1]' || host === '0.0.0.0' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    }
    function openShare(wechat = false) {
      const url = resultURL(sharedOrder || capsule.order);
      const local = localOnlyURL();
      shareDialog.innerHTML = `<div class="dialog-header"><h2 id="share-title">把这个问题，递给一个朋友。</h2><button class="icon-button" type="button" data-share="close" aria-label="关闭分享">×</button></div>
        <p>朋友打开链接，就能看见这份排序和演示预测榜，也能选择「我也来排序」。无需下载文件或登录。</p>
        ${local ? '<p class="share-warning" role="note">当前是本机／内网预览链接，微信好友在外部网络无法打开。请先将网站部署到公开 HTTPS 网址，再从该网址生成链接。现在可在这台电脑测试。</p>' : '<p class="section-help">请确认当前网址能在外部网络访问；此页面不会验证域名的公网可达性。</p>'}
        <label for="result-share-url">结果页链接（包含排序和用户名，不含邮箱或头像）</label><input id="result-share-url" type="text" readonly value="${esc(url)}" autocomplete="off" spellcheck="false">
        <div class="share-dialog-actions"><button class="button button-dark" type="button" data-share="copy">复制结果链接</button><a class="button button-outline" href="${esc(url)}" target="_blank" rel="noopener">预览结果页 ↗</a>${typeof navigator.share === 'function' ? '<button class="button button-outline" type="button" data-share="native">系统分享…</button>' : ''}</div>
        <section class="wechat-instructions"><h3>分享到微信</h3><ol><li>点击「复制结果链接」。</li><li>打开微信，在聊天中粘贴并发送给朋友。</li><li>若系统分享菜单中提供微信，也可在那里选择微信；网站不能直接替你发送。</li></ol><p>${/MicroMessenger/i.test(navigator.userAgent) ? '在微信中：先打开上方结果页，再尝试右上角「…」→ 分享给朋友。' : '微信内的专属卡片标题、封面及分享菜单定制，需要后续接入公众号 JS-SDK 与服务端签名。'}</p></section>
        <p class="share-privacy">链接是可转发的排序快照，不是加密或经验证的预测凭证。删除本地胶囊不会撤回已发出的链接，之后修改排序也不会改变旧链接。</p><p id="share-feedback" role="status" aria-live="polite">${wechat ? (local ? '按下方步骤分享；本机链接须先部署后才能发给好友访问。' : '复制链接后，打开微信粘贴给朋友。') : ''}</p>`;
      shareDialog.showModal();
    }
    shareDialog.addEventListener('click', async event => {
      const action = event.target.closest('[data-share]')?.dataset.share;
      const feedback = shareDialog.querySelector('#share-feedback');
      if (action === 'close') shareDialog.close();
      if (action === 'copy') {
        const field = shareDialog.querySelector('#result-share-url');
        try { await navigator.clipboard.writeText(field.value); feedback.textContent = localOnlyURL() ? '已复制。本机链接仅供本机测试，部署后才能给微信好友访问。' : '已复制结果链接，打开微信聊天，粘贴后即可发送。'; }
        catch { field.focus(); field.select(); feedback.textContent = '浏览器未允许自动复制。链接已选中，请长按复制，或按 ⌘C / Ctrl+C。'; }
      }
      if (action === 'native') {
        try { await navigator.share({title:'职业时光胶囊 — 墨愚',text:'这是我对职业未来的排序。你会怎么排？',url:shareDialog.querySelector('#result-share-url').value}); feedback.textContent = '已完成系统分享操作；网站无法确认接收方是否收到。'; }
        catch (error) { feedback.textContent = error.name === 'AbortError' ? '已取消分享，结果链接仍可复制。' : '此设备暂不支持这次系统分享，请复制链接后粘贴到微信。'; }
      }
    });
    shareDialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); shareDialog.close(); } });
    function rankingChart(rows, referenceOrder, shared) {
      return `<figure class="career-chart" aria-labelledby="chart-title" aria-describedby="chart-explanation"><figcaption id="chart-title">大家的预测</figcaption><p id="chart-explanation" class="section-help">柱越长，越被认为会先消失。仅为预测，不是事实。</p>
        <div class="career-axis" aria-hidden="true"><span>0</span><span>2</span><span>4</span><span>6</span><span>8 分</span></div>
        <ol class="career-bars">${rows.map(row => { const score = 9-row.average; return `<li class="career-row"><div class="career-label"><span>${String(row.rank).padStart(2,'0')}</span><strong>${row.name}${row.tied?'（并列）':''}</strong></div><div class="career-plot" aria-hidden="true"><span class="career-bar" style="width:${score/8*100}%"></span></div><strong class="career-value">${score.toFixed(2)}<span> 分</span></strong></li>`; }).join('')}</ol>
        <p class="chart-source data-badge">Demo · 6 份模拟 + ${shared?'分享者':'你的'} 1 份排序</p></figure>`;
    }
    const reducedRankMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const rankAnimations=new Map();
    let rankHighlightTimer;
    function clearRankMotion(){
      clearTimeout(rankHighlightTimer);
      rankAnimations.forEach(animation=>animation.cancel());rankAnimations.clear();
      app.querySelectorAll('.rank-moving,.rank-displaced,.rank-settled').forEach(row=>row.classList.remove('rank-moving','rank-displaced','rank-settled'));
    }
    reducedRankMotion.addEventListener('change',()=>{if(reducedRankMotion.matches)clearRankMotion();});
    window.addEventListener('pagehide',clearRankMotion);
    window.addEventListener('resize',clearRankMotion);
    function setResultLayout(active) {
      clearRankMotion();
      document.body.classList.toggle('capsule-result-view', active);
      document.querySelectorAll('.event-main > .breadcrumb,.event-main > .event-heading,.event-main > .demo-notice').forEach(el => { el.hidden = active; });
      status.textContent = '';
    }
    function rankList() {
      return order.map((id, index) => {
        const job = D.jobs.find(j => j.id === id);
        return `<li class="rank-item" draggable="true" data-job="${id}"><span class="drag-handle" aria-hidden="true">⠿</span><span class="rank-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="rank-name"><strong>${job.name}</strong></span><span class="rank-controls"><button type="button" class="move-button" data-move="-1" data-id="${id}" aria-label="上移${job.name}" ${index===0?'disabled':''}>↑</button><button type="button" class="move-button" data-move="1" data-id="${id}" aria-label="下移${job.name}" ${index===order.length-1?'disabled':''}>↓</button></span></li>`;
      }).join('');
    }
    function renderEditor() {
      setResultLayout(false);
      app.innerHTML = `<div class="capsule-workspace"><section class="workbench" aria-label="调整职业排序"><div class="rank-direction"><span>最早消失 ↓</span><span>拖动或用箭头调整</span></div><ol class="rank-list" aria-label="职业预测排序">${rankList()}</ol></section>
      <form class="capsule-submit-panel" id="capsule-form" novalidate><label for="capsule-email">提醒邮箱 <span>选填</span></label><input type="email" id="capsule-email" name="email" maxlength="254" autocomplete="email" placeholder="you@example.com" value="${esc(email)}" aria-describedby="email-help email-error"><p id="email-help">仅本机保存，不公开。Demo 暂不发送职业提醒。</p><p id="email-error" class="field-error" role="alert"></p><label class="check-label" id="capsule-consent-row" ${email?'':'hidden'}><input type="checkbox" id="email-consent" ${consent?'checked':''}><span>同意在此浏览器保存邮箱，了解暂不发送提醒。</span></label><p id="consent-error" class="field-error" role="alert"></p><button class="button button-dark" type="submit">封存我的排序 →</button>
      ${capsule?'<button type="button" class="text-link" data-action="cancel-edit">返回已封存的结果</button>':''}<details class="capsule-rules"><summary>活动说明</summary><p>这只是对职业变化的主观预测，不是就业建议；初始顺序不是推荐答案。部分任务自动化不等于职业消失。结果榜含 6 份模拟样本，重复提交替换本机旧记录。分享链接只包含次序和用户名，不含邮箱。</p></details></form></div>`;
    }
    function renderResults() {
      setResultLayout(true);
      const shared = Boolean(sharedOrder);
      const resultOrder = sharedOrder || capsule.order;
      const rows = D.rankJobs([...D.seedOrders.map(p=>p.order), resultOrder]);
      const emailText = !shared && capsule.email ? `本机邮箱：${esc(capsule.email)}。邮件提醒尚未开通。` : '未留下邮箱。';
      const author=shared?sharedName:ownerName();
      document.title = `${author}的排序 — 墨愚时光胶囊`;
      app.innerHTML = `<section class="personal-result" aria-labelledby="result-title">
        <header class="personal-result-heading"><p class="${shared?'shared-banner':'result-eyebrow'}">${esc(author)}的排序</p><h1 id="result-title">哪个职业会先消失？</h1><p class="order-direction">从最早到最晚 <span aria-hidden="true">↓</span></p></header>
        <ol class="receipt-order personal-order" aria-label="${shared?'分享者':'我的'}职业消失先后预测">${resultOrder.map((id,i)=>`<li><span class="personal-rank" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><strong>${jobName(id)}</strong>${i===0?'<span class="order-endpoint">最早</span>':i===7?'<span class="order-endpoint">最晚</span>':''}</li>`).join('')}</ol>
        ${!shared&&!persisted?'<p class="result-storage-warning" role="status">仅本次会话保存，请复制结果链接留存。</p>':''}
        <div class="result-primary-actions">${shared?button('participate','我也来排序 →'):button('share-result','分享我的排序 →')}<a class="button button-outline" href="#everyone-chart">看看大家怎么排 ↓</a></div>
        <div class="result-secondary-actions">${shared?'<button type="button" class="text-link" data-action="share-result">分享结果链接</button>':'<button type="button" class="text-link" data-action="edit-capsule">重新调整</button>'}<button type="button" class="text-link" data-action="wechat-share">分享到微信 ↗</button></div>
        </section>
        <section class="result-community" id="everyone-chart" aria-labelledby="community-title"><h2 id="community-title">换个视角，看看大家。</h2>
        ${rankingChart(rows,resultOrder,shared)}
        <details class="chart-table-details"><summary>计分说明与详细数据</summary><p class="section-help">提前分 = 9 − 平均顺位，范围 1—8 分；不是替代概率或年份。相同均值并列，打开分享链接不增加票数。</p><div class="table-wrap"><table class="rank-table"><thead><tr><th scope="col">排名</th><th scope="col">职业</th><th scope="col">平均顺位</th><th scope="col">最早票数</th><th scope="col">${shared?'TA':'你'}的顺位</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${String(row.rank).padStart(2,'0')}</td><td>${row.name}${row.tied?'（并列）':''}</td><td>${row.average.toFixed(2)}</td><td>${row.first} / ${row.total}</td><td>${resultOrder.indexOf(row.id)+1}</td></tr>`).join('')}</tbody></table></div></details>
        ${shared?`<div class="community-join">${button('participate','我也来排序 →')}</div>`:''}</section>
        ${shared?'':`<details class="result-settings"><summary>管理我的胶囊</summary><p>${emailText} 排序仅本机保存；分享链接不含邮箱。</p><div class="privacy-actions">${capsule.email?'<button class="text-link danger-link" data-action="remove-email">删除已保存的邮箱</button>':''}<button class="text-link danger-link" data-action="delete-capsule">删除整个本地胶囊</button></div></details>`}`;
    }
    function route() {
      if (shareDialog.open) shareDialog.close();
      const params = new URLSearchParams(location.search);
      sharedName = params.getAll('author').length===1 ? safeName(params.get('author')) : '匿名访客';
      sharedOrder = params.has('result') && params.getAll('result').length === 1 ? D.decodeResult(params.get('result')) : null;
      if (params.has('result') && !sharedOrder) {
        setResultLayout(false);
        document.title = '结果链接无效 — 墨愚';
        app.innerHTML = `<section class="receipt invalid-result"><h2>这封未来来信，缺了一页。</h2><p>结果链接不完整、格式错误或版本暂不支持。请让朋友重新复制完整链接，也可以直接参与活动。</p>${button('participate','我也来排序 →')}</section>`;
        return;
      }
      if (sharedOrder) renderResults();
      else if (params.get('compose') === '1' || !capsule) { document.title='职业时光胶囊 — 墨愚'; renderEditor(); }
      else renderResults();
    }
    function clearResultURL() { const url=new URL(location.href); url.search=''; url.hash=''; history.replaceState(null,'',url); sharedOrder=null; }
    window.addEventListener('popstate', route);
    window.addEventListener('pageshow',event=>{if(event.persisted && document.body.classList.contains('capsule-result-view'))route();});
    window.addEventListener('moyu:account-change',()=>{if((window.MoyuAccount?.current()?.id||null)===initialIdentity && document.body.classList.contains('capsule-result-view'))renderResults();});
    function move(from, to, focusDirection) {
      if (!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=order.length||to>=order.length||from===to) return;
      const list=app.querySelector('.rank-list');if(!list)return;
      const id = order[from];
      const rows=new Map([...list.children].map(row=>[row.dataset.job,row]));
      // Capture the currently painted positions BEFORE cancelling interrupted motion.
      const first=new Map([...rows].map(([key,row])=>[key,row.getBoundingClientRect()]));
      const affected=new Set(order.slice(Math.min(from,to),Math.max(from,to)+1));
      clearRankMotion();
      order = D.moveJob(order, from, to);
      // Keep the same DOM nodes: names, buttons and keyboard focus retain identity.
      order.forEach((key,index)=>{
        const row=rows.get(key);list.append(row);
        row.querySelector('.rank-number').textContent=String(index+1).padStart(2,'0');
        row.querySelector('[data-move="-1"]').disabled=index===0;
        row.querySelector('[data-move="1"]').disabled=index===order.length-1;
        row.classList.remove('is-dragging','drag-over');
      });
      const last=new Map([...rows].map(([key,row])=>[key,row.getBoundingClientRect()]));
      const duration=Math.min(620,360+Math.abs(to-from)*35);
      rows.forEach((row,key)=>{
        const before=first.get(key),after=last.get(key);
        const dx=before.left-after.left,dy=before.top-after.top;
        if(affected.has(key))row.classList.add(key===id?'rank-moving':'rank-displaced');
        if(!reducedRankMotion.matches&&typeof row.animate==='function'&&(Math.abs(dx)>.5||Math.abs(dy)>.5)){
          const animation=row.animate([{transform:`translate(${dx}px, ${dy}px)`},{transform:'translate(0, 0)'}],{duration,easing:'cubic-bezier(.22, 1, .36, 1)'});
          rankAnimations.set(key,animation);
          animation.onfinish=()=>{if(rankAnimations.get(key)!==animation)return;rankAnimations.delete(key);row.classList.remove('rank-moving','rank-displaced');if(key===id)row.classList.add('rank-settled');};
        }
      });
      // A brief, non-moving highlight also communicates changes with reduced motion.
      rankHighlightTimer=setTimeout(()=>rows.forEach(row=>row.classList.remove('rank-moving','rank-displaced','rank-settled')),duration+750);
      const feedback=`${jobName(id)}：第 ${from+1} 位 → 第 ${to+1} 位`;
      const hint=app.querySelector('.rank-direction>span:last-child');if(hint)hint.textContent=feedback;
      say(`${jobName(id)}已从第 ${from+1} 位移到第 ${to+1} 位，${affected.size-1} 个职业随之让位。`);
      const row = rows.get(id);
      const preferred = row.querySelector(`[data-move="${focusDirection || -1}"]:not(:disabled)`);
      (preferred || row.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
    }
    app.addEventListener('input', event => { if(event.target.id==='capsule-email'){email=event.target.value;app.querySelector('#capsule-consent-row').hidden=!email.trim();} if(event.target.id==='email-consent') consent=event.target.checked; });
    app.addEventListener('submit', event => {
      if(event.target.id !== 'capsule-form') return;
      event.preventDefault();
      const input = app.querySelector('#capsule-email');
      email=input.value.trim(); input.value=email;
      consent=app.querySelector('#email-consent').checked;
      app.querySelector('#capsule-consent-row').hidden=!email;
      const error = email && !input.validity.valid ? '请输入有效的邮箱地址，或留空后继续。' : '';
      app.querySelector('#email-error').textContent=error;
      input.setAttribute('aria-invalid', Boolean(error));
      app.querySelector('#consent-error').textContent=email&&!consent ? '保存邮箱前，请勾选同意；也可以清空邮箱后参与。' : '';
      if(error) { input.focus(); return; }
      if(email&&!consent) { app.querySelector('#email-consent').focus(); return; }
      capsule={version:1,order:[...order],email:email||null,reminderStatus:'demo-not-connected',createdAt:new Date().toISOString()};
      persisted=store.save('capsule-v1',capsule);
      clearResultURL(); renderResults(); focusStart(); say(persisted?'已封存。你的排序已计入本地演示榜。':'存储不可用；请复制结果链接，避免刷新后丢失。');
    });
    app.addEventListener('click', event => {
      const moveButton=event.target.closest('[data-move]');
      if(moveButton) { const from=order.indexOf(moveButton.dataset.id); move(from,from+Number(moveButton.dataset.move),Number(moveButton.dataset.move)); return; }
      const action=event.target.closest('[data-action]')?.dataset.action;
      if(action==='edit-capsule') { order=[...capsule.order]; email=capsule.email||''; consent=Boolean(email); renderEditor(); focusStart(); say('调整后再次封存，才会更新榜单。'); }
      if(action==='cancel-edit') { clearResultURL(); renderResults(); focusStart(); }
      if(action==='remove-email') { capsule.email=null; email=''; consent=false; persisted=store.save('capsule-v1',capsule); renderResults(); say(persisted?'邮箱已从本地胶囊移除。':'无法更新持久存储，请在浏览器站点设置中清除本地数据。'); }
      if(action==='delete-capsule' && confirm('删除此浏览器中的胶囊、排序和邮箱？此操作不可撤销。')) { const removed=store.remove('capsule-v1'); capsule=null; email=''; consent=false; order=D.jobs.map(j=>j.id); renderEditor(); focusStart(); say(removed?'本地胶囊已删除。':'本次会话已清空；请在浏览器站点设置中清除持久存储。'); }
      if(action==='share-result' || action==='wechat-share') openShare(action==='wechat-share');
      if(action==='participate') {
        const url=new URL('capsule.html',location.href); url.searchParams.set('compose','1'); history.pushState(null,'',url);
        sharedOrder=null; order=[...(capsule?.order || D.jobs.map(j=>j.id))]; email=capsule?.email||''; consent=Boolean(email);
        route(); focusStart(); say(capsule?'从你原有的排序继续；再次封存才会更新自己的胶囊。':'现在请排出你自己的答案。不会沿用或提交朋友的排序。');
      }
    });
    app.addEventListener('dragstart', event => { const row=event.target.closest('[data-job]'); if(!row)return; clearRankMotion(); dragging=row.dataset.job; event.dataTransfer.effectAllowed='move'; event.dataTransfer.setData('text/plain',dragging); row.classList.add('is-dragging'); });
    app.addEventListener('dragover', event => { if(!dragging)return; const row=event.target.closest('[data-job]'); if(!row)return; event.preventDefault(); event.dataTransfer.dropEffect='move'; app.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over')); row.classList.add('drag-over'); });
    app.addEventListener('drop', event => { const row=event.target.closest('[data-job]'); if(!row||!dragging)return; event.preventDefault(); const from=order.indexOf(dragging),to=order.indexOf(row.dataset.job); if(from>=0&&to>=0)move(from,to); dragging=null; app.querySelectorAll('.drag-over,.is-dragging').forEach(el=>el.classList.remove('drag-over','is-dragging')); });
    app.addEventListener('dragend',()=>{dragging=null;app.querySelectorAll('.drag-over,.is-dragging').forEach(el=>el.classList.remove('drag-over','is-dragging'));});
    route();
  }

  function generationActivity() {
    const saved=store.read('answers-v1');
    let response=D.validResponse(saved)?saved:null;
    let cohort=response?.cohort || '';
    let mode='setup';
    let index=0;
    let answers={};
    let guesses=[];
    let round=[];
    let selected=null;
    let revealed=false;
    let persisted=true;
    const letter=i=>'ABCD'[i];
    function distribution(q,counts) {
      const total=counts.reduce((a,b)=>a+b,0), winners=D.modes(counts);
      return `<div class="distribution" aria-label="各选项票数">${q.options.map((option,i)=>`<div class="distribution-row ${winners.includes(i)?'is-mode':''}"><div class="bar-label"><span>${letter(i)}. ${esc(option)}${winners.includes(i)?' · 最多票':''}</span><span>${counts[i]} 票 / ${total?Math.round(counts[i]/total*100):0}%</span></div><div class="distribution-track" aria-hidden="true"><div class="distribution-fill" style="width:${total?counts[i]/total*100:0}%"></div></div></div>`).join('')}</div><p class="rounding-note">百分比经过四舍五入，合计可能不为 100%。</p>`;
    }
    function setup() {
      mode='setup';
      app.innerHTML=`<section class="setup"><fieldset><legend>先告诉我们，你在哪一个年代长大？</legend><p class="section-help" id="cohort-help">按出生年份选择。作答会记入该组；猜答案时，只会遇到另外两个年龄段。</p><div class="cohort-options">${D.cohorts.map(c=>`<label class="cohort-choice"><input type="radio" name="cohort" value="${c.id}" ${cohort===c.id?'checked':''} aria-describedby="cohort-help cohort-error"><span><strong>${c.label}</strong><small>${c.years}</small></span></label>`).join('')}</div><p id="cohort-error" class="field-error" role="alert"></p></fieldset><div class="mode-grid"><button type="button" class="mode-card" data-action="start-self"><span class="mode-number">01 / LEAVE YOUR VOICE</span><strong>${response?'修改我的回答':'留下我的回答'} →</strong><span>回答 4 道生活小问题。没有对错，你的选择会加入当前年龄段的本地统计。</span></button><button type="button" class="mode-card" data-action="start-guess"><span class="mode-number">02 / LISTEN TO ANOTHER AGE</span><strong>猜猜另一代 →</strong><span>每题告诉你目标年龄段。猜中该组最多人选择的选项，即算答对。</span></button></div><p class="section-help">每个题目、每个年龄段预置 40 份模拟回答。最多票可能并列；并列选项都算猜中，多数不代表价值上的「正确」。</p>${response?`<div class="privacy-actions"><button class="text-link" data-action="view-answers">查看已保存的回答 →</button><button class="text-link danger-link" data-action="delete-answers">删除我的本地回答</button></div>`:''}</section>`;
    }
    function quiz() {
      const q=D.questions[index];
      const target=mode==='guess'?round[index].cohort:cohort;
      const targetText=mode==='guess'?`这一题，请猜 <strong>${cohortName(target)}</strong> 的多数选择。`:`你正在以 <strong>${cohortName(cohort)}</strong> 的身份回答。`;
      app.innerHTML=`<div class="quiz-layout"><section class="quiz-card"><div class="quiz-topline"><span>${mode==='guess'?'猜猜另一代':'留下我的回答'}</span><span>第 ${index+1} / ${D.questions.length} 题</span></div><progress class="quiz-progress" value="${index}" max="${D.questions.length}" aria-label="已完成题数">${index} / ${D.questions.length}</progress><p class="target-label">${targetText}</p><span class="question-category">${q.topic}</span><h2 id="question-title">${q.title}</h2><fieldset aria-labelledby="question-title"><div class="answer-options">${q.options.map((option,i)=>`<label class="answer-option"><input type="radio" name="answer" value="${i}" ${selected===i?'checked':''} ${revealed?'disabled':''}><span class="option-letter">${letter(i)}</span><span>${esc(option)}</span></label>`).join('')}</div></fieldset><p id="answer-error" class="field-error" role="alert"></p>${revealed?reveal(q):''}<div class="quiz-controls">${mode==='self'?`<button type="button" class="text-link" data-action="previous" ${index===0?'disabled':''}>← 上一题</button>`:'<button type="button" class="text-link" data-action="leave-round">结束本轮</button>'}<button type="button" class="button button-dark" data-action="advance">${mode==='guess'&&!revealed?'揭晓答案':index===D.questions.length-1?(mode==='self'?'提交我的回答':'查看本轮结果'):'下一题 →'}</button></div></section><aside class="quiz-aside"><span class="eyebrow">HOW IT WORKS</span><h3>${mode==='guess'?'不是判断，是理解。':'不用代表整整一代人。'}</h3><p>${mode==='guess'?'「正确答案」由目标年龄段选择最多的选项决定。出现并列时，选中任一并列选项都算答对。':'请选最接近你自己的想法，不用猜别人的期待。提交全部 4 题后，才更新统计。'}</p><p>${mode==='guess'?'本轮开始时锁定票数；猜测本身不记入真实回答统计，也不会改变多数答案。':'一台设备只保留最新的一份回答。修改年龄段后再提交，会移走旧组中的那一票，不会跨组重复计数。'}</p><p>Demo 票数只为演示交互，不是对任何年龄段的事实判断。</p><button type="button" class="text-link" data-action="leave-round">返回选择模式 →</button></aside></div>`;
    }
    function reveal(q) {
      const entry=guesses[index];
      const winners=D.modes(entry.counts);
      const headline=entry.correct===null?'这一组还没有答案':entry.correct?'这一题，你听见了他们的回声。':'这一次，他们的选择有些不同。';
      return `<section class="answer-reveal" aria-labelledby="reveal-title" tabindex="-1"><h3 id="reveal-title">${headline}</h3><p>你猜的是 ${letter(entry.answer)}。${winners.length?`${cohortName(entry.cohort)} 的${winners.length>1?'并列最多票':'最多票'}选项：${winners.map(i=>`${letter(i)}「${esc(q.options[i])}」`).join('、')}。`:'暂无票数，此题不计分。'}</p>${distribution(q,entry.counts)}<p class="section-help">样本：40 份模拟回答${response?.cohort===entry.cohort?' + 你在此设备上的 1 份回答':''}。这只是本轮开始时的演示快照。</p></section>`;
    }
    function selfResults() {
      mode='self-result';
      app.innerHTML=`<div class="result-heading"><div><span class="event-kicker">YOUR VOICE / ${cohortName(response.cohort)}</span><h2>${persisted?'你的答案，已加入这份回声。':'答案已提交，仅本次会话保留。'}</h2><p>${persisted?'仅保存在当前浏览器。':'浏览器存储不可用，刷新后可能丢失。'}以下票数为 40 份模拟回答 + 你的 1 份回答。</p></div><div class="result-actions">${button('guess-after-self','猜猜另一代 →')}${button('back-setup','选择模式',true)}</div></div>${D.questions.map(q=>`<article class="answer-summary"><span class="eyebrow">${q.topic}</span><h3>${q.title}</h3><p class="your-choice">你的回答：${letter(response.answers[q.id])}. ${esc(q.options[response.answers[q.id]])}</p>${distribution(q,D.tally(q,response.cohort,response))}</article>`).join('')}<p class="section-help">你代表的只是你自己。这些 Demo 票数不能用来概括任何一代人。</p>`;
    }
    function guessResults() {
      mode='guess-result';
      const scored=guesses.filter(g=>g.correct!==null);
      const score=scored.filter(g=>g.correct).length;
      app.innerHTML=`<div class="result-heading"><div><span class="event-kicker">ACROSS THE GENERATIONS / 本轮回声</span><h2>不同年代，也会有相似的答案。</h2><div class="quiz-score"><strong>${score}</strong><span>/ ${scored.length} 题猜中</span></div><p>猜中的是演示样本的多数，不是理解他人的唯一标准。</p></div><div class="result-actions">${button('play-again','再猜一轮')}${button('back-setup','留下自己的回答',true)}</div></div>${guesses.map((g,i)=>{const q=D.questions[i];return `<article class="answer-summary"><span class="eyebrow">${cohortName(g.cohort)} / ${g.correct===null?'不计分':g.correct?'猜中':'未猜中'}</span><h3>${q.title}</h3><p>你的猜测：${letter(g.answer)}. ${esc(q.options[g.answer])}</p><p class="your-choice">最多票：${D.modes(g.counts).map(n=>`${letter(n)}. ${esc(q.options[n])}`).join('；')||'暂无'}</p></article>`;}).join('')}<a class="event-link-block" href="capsule.html"><span>还想把一个问题交给未来？</span><span>职业时光胶囊 ↗</span></a>`;
    }
    function startGuess() {
      const targets=D.cohorts.filter(c=>c.id!==cohort).map(c=>c.id);
      if(Math.random()<.5)targets.reverse();
      round=D.questions.map((q,i)=>({cohort:targets[i%targets.length],counts:D.tally(q,targets[i%targets.length],response)}));
      mode='guess'; index=0; guesses=[]; selected=null; revealed=false; quiz(); focusStart(); say('每道题的目标年龄段已标明。请猜他们的选择，而不是你的选择。');
    }
    app.addEventListener('change',event=>{
      if(event.target.name==='cohort') {cohort=event.target.value;app.querySelector('#cohort-error').textContent='';}
      if(event.target.name==='answer') {selected=Number(event.target.value);if(mode==='self')answers[D.questions[index].id]=selected;app.querySelector('#answer-error').textContent='';}
    });
    app.addEventListener('click',event=>{
      const action=event.target.closest('[data-action]')?.dataset.action;
      if(!action)return;
      if(action==='start-self'||action==='start-guess') {
        if(!D.cohorts.some(c=>c.id===cohort)){app.querySelector('#cohort-error').textContent='请先选择出生年龄段，再进入活动。';app.querySelector('input[name=cohort]').focus();return;}
        if(action==='start-guess')startGuess();
        else {mode='self';index=0;answers=response?.cohort===cohort?{...response.answers}:{};selected=answers[D.questions[0].id]??null;revealed=false;quiz();focusStart();say('选最接近你自己想法的一项。');}
      }
      if(action==='advance') {
        if(selected===null){app.querySelector('#answer-error').textContent='请选择一个选项后继续。';app.querySelector('input[name=answer]').focus();return;}
        if(mode==='guess'&&!revealed){const snapshot=round[index];guesses[index]={...snapshot,answer:selected,correct:D.grade(snapshot.counts,selected)};revealed=true;quiz();app.querySelector('.answer-reveal').focus();say(guesses[index].correct===null?'此题暂无票数，不计分。':guesses[index].correct?'猜中了，请查看票数。':'未猜中，请查看多数选择与票数。');return;}
        if(index<D.questions.length-1){index++;selected=mode==='self'?(answers[D.questions[index].id]??null):null;revealed=false;quiz();focusStart();say(`第 ${index+1} 题。`);}
        else if(mode==='self'){response={version:1,cohort,answers:{...answers},updatedAt:new Date().toISOString()};persisted=store.save('answers-v1',response);selfResults();focusStart();say(persisted?'已保存全部回答，并替换此设备的上一份记录。':'存储不可用，答案仅本次会话保存。');}
        else {guessResults();focusStart();say('本轮已完成，以下是逐题回顾。');}
      }
      if(action==='previous'&&index>0){index--;selected=answers[D.questions[index].id]??null;quiz();focusStart();}
      if(action==='leave-round'){if(confirm('离开当前答题？本轮尚未提交的进度不会保存。')){setup();focusStart();say('已回到模式选择，之前提交的回答未改变。');}}
      if(action==='back-setup'){setup();focusStart();say('可以选择年龄段和模式。');}
      if(action==='view-answers'){selfResults();focusStart();}
      if(action==='guess-after-self'){cohort=response.cohort;startGuess();}
      if(action==='play-again')startGuess();
      if(action==='delete-answers'&&confirm('删除此设备上的年龄段和全部回答？对应票数也将移除。')){const removed=store.remove('answers-v1');response=null;cohort='';setup();focusStart();say(removed?'本地回答已删除，统计恢复为纯模拟数据。':'本次会话已清空；请在浏览器站点设置中清除持久存储。');}
    });
    setup();
  }
  if(document.body.dataset.activity==='capsule')capsuleActivity();
  else generationActivity();
})();