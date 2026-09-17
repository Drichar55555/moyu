(async function(){
  'use strict';
  const A=window.MoyuAccount;
  const content=document.querySelector('#account-content');
  content.innerHTML='<p role="status">正在读取账号…</p>';
  await A.ready;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tones={ink:'墨黑',clay:'陶红',moss:'苔绿',sand:'暖砂'};
  let mode='login', loginMethod='password', busy=false, avatar='',tone='ink',dirty=false;
  let challengeId='',challengeEmail='',nextSendAt=0,cooldownTimer;
  const home=new URL('index.html',location.href);
  const allowed=['index.html','activities.html','capsule.html','generations.html'];
  let returnURL=home;
  try {const target=new URL(new URLSearchParams(location.search).get('returnTo')||'index.html',location.href);if(target.origin===home.origin&&(target.pathname===new URL('./',home).pathname||allowed.some(p=>target.pathname===new URL(p,home).pathname)))returnURL=target;}catch{/* Ignore unsafe return URLs. */}
  // One navigation only: the homepage consumes and removes this marker on arrival.
  if(returnURL.pathname===home.pathname||returnURL.pathname===new URL('./',home).pathname)returnURL.searchParams.set('accountReturn','1');
  document.querySelector('#account-return').href=returnURL.href;
  function message(text,error=false){const el=content.querySelector('#account-feedback');if(el){el.textContent=text;el.classList.toggle('is-error',error);}}
  function loading(value){busy=value;content.querySelectorAll('button,input').forEach(el=>{if(value){el.dataset.wasDisabled=String(el.disabled);el.disabled=true;}else if('wasDisabled' in el.dataset){el.disabled=el.dataset.wasDisabled==='true';delete el.dataset.wasDisabled;}});content.setAttribute('aria-busy',value);}
  function wechat(){return `<div class="wechat-login"><button type="button" class="wechat-login-button" disabled aria-describedby="wechat-login-help">微信登录 <span>待接入</span></button><details><summary>为什么暂不能微信登录？</summary><p id="wechat-login-help">需要微信开放平台的网站应用、已配置的回调域名和服务端 OAuth 校验。当前未连接微信，不会生成假二维码，也不会索取你的微信密码。</p></details></div>`;}
  function renderAuth(){
    dirty=false;
    challengeId='';challengeEmail='';clearInterval(cooldownTimer);
    const registering=mode==='register',codeLogin=!registering&&loginMethod==='code';
    content.innerHTML=`<div class="account-tabs" role="group" aria-label="账号方式"><button type="button" data-mode="login" aria-pressed="${!registering}">登录</button><button type="button" data-mode="register" aria-pressed="${registering}">注册</button></div>
      <h2>${registering?'从一个名字开始。':'欢迎回来。'}</h2>
      ${!registering?`<div class="login-methods" role="group" aria-label="登录方式"><button type="button" data-login-method="password" aria-pressed="${!codeLogin}">账号密码登录</button><button type="button" data-login-method="code" aria-pressed="${codeLogin}">邮箱验证码登录</button></div>`:''}
      <form id="auth-form" novalidate>
      ${!codeLogin?`<label for="account-handle">${registering?'登录账号':'邮箱 / 登录账号 / 用户名'}</label><input id="account-handle" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="1" maxlength="${registering?64:254}" required aria-describedby="handle-hint account-feedback"><p id="handle-hint" class="field-hint">${registering?'1—64 个字符，可使用中文，不公开在结果中。':'输入完整邮箱地址、登录账号或用户名；用户名重名时请使用邮箱。'}</p>
      ${registering?'<label for="account-name">用户名</label><input id="account-name" name="nickname" autocomplete="nickname" maxlength="24" required aria-describedby="name-hint account-feedback"><p id="name-hint" class="field-hint">1—24 个字符，用于「用户名的排序」，会随链接公开。</p>':''}
      <label for="account-password">${registering?'设置密码':'密码'}</label><div class="password-field"><input id="account-password" name="password" type="password" autocomplete="${registering?'new-password':'current-password'}" minlength="8" maxlength="128" required aria-describedby="account-feedback"><button type="button" data-account="toggle-password" aria-label="显示密码" aria-pressed="false">显示</button></div>`:''}
      ${registering||codeLogin?`<label for="register-email">${codeLogin?'已注册邮箱':'邮箱'}</label><div class="verification-email"><input id="register-email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="verification-help account-feedback"><button type="button" data-account="send-code">获取验证码</button></div><label for="register-code">邮箱验证码</label><input id="register-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required aria-describedby="verification-help account-feedback"><p id="verification-help" class="field-hint">${codeLogin?'无需密码，请填写登录邮件中的验证码。':'查收注册邮件中的验证码。'}6 位数字，10 分钟内有效；修改邮箱或切换方式后需重新获取。</p>${!A.serviceStatus().emailAvailable?'<p class="mail-unavailable" role="note">邮件服务尚未配置，暂不能发送验证码。已有账号可切换至账号密码登录。</p>':''}`:''}
      ${registering?'<label class="account-consent"><input id="account-consent" type="checkbox"><span>同意将账号、邮箱和资料保存在本站，用于身份验证；邮箱不公开在分享链接中。</span></label>':''}
      <p id="account-feedback" role="status" aria-live="polite"></p><button class="button button-dark account-submit" type="submit">${registering?'验证邮箱并注册':codeLogin?'验证并登录':'登录并返回网站'}</button></form>${wechat()}<a class="account-guest text-link" href="${esc(returnURL.href)}">暂不登录，继续体验 →</a>`;
    addPasswordHint();
    updateCountdown();
    if(nextSendAt>Date.now())cooldownTimer=setInterval(updateCountdown,1000);
  }
  function updateCountdown(){const b=content.querySelector('[data-account="send-code"]');if(!b)return;const seconds=Math.max(0,Math.ceil((nextSendAt-Date.now())/1000));b.textContent=seconds?`${seconds} 秒后重发`:'获取验证码';b.disabled=busy||seconds>0;if(!seconds)clearInterval(cooldownTimer);}
  function goBack(){dirty=false;clearInterval(cooldownTimer);location.assign(returnURL.href);}
  function addPasswordHint(){
    const input=content.querySelector('#account-password');if(!input)return;
    const hint=document.createElement('p');hint.id='password-hint';hint.className='field-hint';
    hint.textContent=mode==='register' ? A.passwordHint : `新注册密码要求：${A.passwordHint} 登录请使用注册时的原密码。`;
    input.setAttribute('aria-describedby','password-hint account-feedback');input.closest('.password-field').after(hint);
  }
  function preview(){
    const el=content.querySelector('#avatar-preview');if(!el)return;
    el.className=`account-avatar profile-avatar tone-${tone}`;el.replaceChildren();
    if(avatar){const img=document.createElement('img');img.src=avatar;img.alt='头像预览';el.append(img);}else el.textContent=Array.from(content.querySelector('#profile-name').value.trim()||A.current()?.name||'墨')[0];
    content.querySelectorAll('[data-tone]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tone===tone));
  }
  function renderProfile(){
    const user=A.current();if(!user){mode='login';renderAuth();return;}
    avatar=user.avatar;tone=user.tone;dirty=false;
    content.innerHTML=`<div class="profile-heading"><div><span class="eyebrow">邮箱已验证</span><h2>你的名字，你的样子。</h2></div><button type="button" class="text-link" data-account="logout">退出登录</button></div><form id="profile-form" novalidate><div class="avatar-editor"><div id="avatar-preview"></div><div><label class="avatar-upload" for="avatar-file">${avatar?'更换头像':'添加头像'}</label><input class="avatar-file" id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="avatar-help account-feedback"><button type="button" class="text-link" data-account="remove-avatar">恢复文字头像</button></div></div><p class="field-hint" id="avatar-help">JPG、PNG 或 WebP，最大 5MB。自动居中裁成方形、压缩为 192px 后保存到本站，不写入分享链接。</p><div class="avatar-tones" role="group" aria-label="文字头像颜色">${Object.entries(tones).map(([key,name])=>`<button type="button" class="tone-choice tone-${key}" data-tone="${key}" aria-label="${name}头像" aria-pressed="${key===tone}"><span aria-hidden="true">墨</span></button>`).join('')}</div><label for="profile-name">用户名</label><input id="profile-name" name="nickname" autocomplete="nickname" value="${esc(user.name)}" maxlength="24" required aria-describedby="profile-name-hint account-feedback"><p id="profile-name-hint" class="field-hint">用于「用户名的排序」。新链接使用新名字，已发出的链接保留原来的署名。</p><p class="profile-handle">登录账号：${esc(user.handle)}</p><p class="profile-handle">已验证邮箱：${esc(user.email)}</p><p id="account-feedback" role="status" aria-live="polite"></p><button class="button button-dark account-submit" type="submit">保存并返回网站</button></form><a class="account-guest text-link" href="${esc(returnURL.href)}">返回刚才的页面 →</a><details class="account-privacy"><summary>账号与数据说明</summary><p>账号、已验证邮箱和头像保存于本站服务器。活动答案目前仍按账号保存在当前浏览器，尚不跨设备同步。旧版本地 Demo 资料不自动上传或迁移；微信授权尚未接入。</p></details>`;
    preview();
  }
  async function readAvatar(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片。');
    if(file.size>5*1024*1024)throw new Error('图片超过 5MB，请选择较小的图片。');
    const url=URL.createObjectURL(file);const img=new Image();
    try{
      img.src=url;await img.decode();
      if(!img.naturalWidth||img.naturalWidth>4096||img.naturalHeight>4096)throw new Error('图片尺寸过大，请将长边缩小至 4096px 以内。');
      const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d');
      const side=Math.min(img.naturalWidth,img.naturalHeight);ctx.fillStyle='#f5f3ed';ctx.fillRect(0,0,192,192);ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,192,192);
      return canvas.toDataURL('image/jpeg',.85);
    }finally{URL.revokeObjectURL(url);}
  }
  content.addEventListener('click',async event=>{
    if(busy)return;
    const tab=event.target.closest('[data-mode]');if(tab){mode=tab.dataset.mode;renderAuth();return;}
    const method=event.target.closest('[data-login-method]');if(method){loginMethod=method.dataset.loginMethod;renderAuth();return;}
    const color=event.target.closest('[data-tone]');if(color){tone=color.dataset.tone;avatar='';dirty=true;preview();return;}
    const action=event.target.closest('[data-account]')?.dataset.account;
    if(action==='toggle-password'){const input=content.querySelector('#account-password');const b=event.target.closest('button');const show=input.type==='password';input.type=show?'text':'password';b.textContent=show?'隐藏':'显示';b.setAttribute('aria-label',show?'隐藏密码':'显示密码');b.setAttribute('aria-pressed',show);}
    if(action==='remove-avatar'){avatar='';dirty=true;preview();message('已恢复文字头像，保存后生效。');}
    if(action==='logout'){if(dirty&&!confirm('资料尚未保存，仍然退出？'))return;loading(true);try{await A.logout();mode='login';renderAuth();message('已退出账号。');}catch(e){message(e.message,true);}finally{loading(false);}}
    if(action==='send-code'){
      const input=content.querySelector('#register-email');const email=input.value.trim().toLowerCase();
      if(!email||!input.validity.valid){message('请输入有效的邮箱地址。',true);input.focus();return;}
      if(Date.now()<nextSendAt)return;
      loading(true);message('正在发送验证码…');
      try{const result=await A.sendCode(email,mode==='register'?'register':'login');challengeId=result.challengeId;challengeEmail=email;nextSendAt=Date.now()+result.retryAfter*1000;message(result.message);clearInterval(cooldownTimer);cooldownTimer=setInterval(updateCountdown,1000);}catch(e){message(e.message,true);}finally{loading(false);updateCountdown();}
    }
  });
  content.addEventListener('input',event=>{if(event.target.id==='profile-name'){dirty=true;preview();}if(event.target.id==='register-email'&&event.target.value.trim().toLowerCase()!==challengeEmail){challengeId='';challengeEmail='';const code=content.querySelector('#register-code');if(code)code.value='';}});
  content.addEventListener('change',async event=>{
    if(event.target.id!=='avatar-file'||!event.target.files[0]||busy)return;
    const input=event.target;loading(true);message('正在处理头像…');
    try{avatar=await readAvatar(input.files[0]);dirty=true;preview();message('预览已更新，点击保存资料后生效。');}catch(e){message(e.name==='EncodingError'?'图片无法读取，请更换一张。':e.message,true);}finally{input.value='';loading(false);}
  });
  content.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if(event.target.id==='profile-form'){
      try{const name=content.querySelector('#profile-name').value.trim();if(!A.validName(name)){content.querySelector('#profile-name').focus();throw new Error('用户名需为 1—24 个文字、数字、空格、点、横线或下划线。');}loading(true);await A.update({name,avatar,tone});goBack();}catch(e){message(e.message,true);loading(false);}return;
    }
    const form=event.target;const handle=content.querySelector('#account-handle');const password=content.querySelector('#account-password');
    const name=content.querySelector('#account-name');
    const codeLogin=mode==='login'&&loginMethod==='code';
    if(!codeLogin&&(!handle.value.trim()||!password.value||(name&&!name.value.trim()))){message('请填写完整账号信息。',true);(!handle.value.trim()?handle:name&&!name.value.trim()?name:password).focus();return;}
    if(mode==='register'&&!content.querySelector('#account-consent').checked){message('请先确认账号资料保存说明。',true);content.querySelector('#account-consent').focus();return;}
    if(mode==='register'&&!A.validPassword(password.value)){message(A.passwordHint,true);password.focus();return;}
    const email=content.querySelector('#register-email')?.value.trim().toLowerCase();const code=content.querySelector('#register-code')?.value.trim();
    if((mode==='register'||codeLogin)&&(!challengeId||email!==challengeEmail||!/^\d{6}$/.test(code||''))){message('请先获取邮箱验证码，再填写收到的 6 位验证码。',true);content.querySelector('#register-code').focus();return;}
    loading(true);message(mode==='register'?'正在验证邮箱并注册…':'正在验证…');
    try{
      if(mode==='register')await A.register({handle:handle.value,name:name.value,password:password.value,email,code,challengeId});
      else if(codeLogin)await A.loginCode({email,code,challengeId});
      else await A.login(handle.value,password.value);
      goBack();
    }catch(e){message(e.message,true);}finally{form.querySelectorAll('input[name=password]').forEach(el=>el.value='');loading(false);}
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  A.current()?renderProfile():renderAuth();
})();