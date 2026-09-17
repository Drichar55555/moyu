/* Server-verified accounts. Credentials and sessions never live in localStorage. */
(function(){
  'use strict';
  let profile=null,emailAvailable=false,available=false;
  const passwordHint='密码 8—128 位即可，不限制字符组合，纯数字或纯字母也可以。';
  const validName=name=>typeof name==='string'&&/^[\p{L}\p{N}_ ·-]{1,24}$/u.test(name)&&name.trim()===name&&name.length>0;
  const validPassword=password=>typeof password==='string'&&password.length>=8&&password.length<=128;
  async function request(url,method='GET',data){
    let response;
    try{response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(25000)});}
    catch{throw new Error('无法连接账号服务，请检查网络后重试。');}
    let result;try{result=await response.json();}catch{throw new Error('账号服务未启动，请使用新版网站服务，不能用纯静态预览注册。');}
    if(!response.ok)throw new Error(result.error||'操作失败，请重试。');return result;
  }
  function current(){return profile?{...profile}:null;}
  function refreshHeader(){
    const user=current();document.querySelectorAll('[data-account-link]').forEach(link=>{
      const url=new URL('account.html',location.href);if(!location.pathname.endsWith('/account.html'))url.searchParams.set('returnTo',location.pathname+location.search+location.hash);
      link.href=url.href;link.replaceChildren();const face=document.createElement('span');face.className=`account-avatar tone-${user?.tone||'ink'}`;face.setAttribute('aria-hidden','true');
      if(user?.avatar){const img=document.createElement('img');img.src=user.avatar;img.alt='';face.append(img);}else face.textContent=user?Array.from(user.name)[0]:'墨';
      const name=document.createElement('span');name.className='account-link-name';name.textContent=user?.name||'登录';link.append(face,name);link.setAttribute('aria-label',user?`${user.name}，账号设置`:'登录或注册');
    });
  }
  function emit(){refreshHeader();window.dispatchEvent(new Event('moyu:account-change'));}
  async function refresh(){try{const data=await request('/api/auth/session');profile=data.user;emailAvailable=data.emailRegistrationAvailable;available=true;}catch{profile=null;emailAvailable=false;available=false;}emit();return current();}
  async function confirmSession(expectedId){const result=await request('/api/auth/session');if(result.user?.id!==expectedId)throw new Error('账号操作已完成，但浏览器未保留登录会话。请允许 Cookie 后登录。');profile=result.user;emit();return current();}
  async function register(data){const result=await request('/api/auth/register','POST',data);return confirmSession(result.user.id);}
  async function login(identifier,password){const result=await request('/api/auth/login','POST',{identifier,password});return confirmSession(result.user.id);}
  async function loginCode(data){const result=await request('/api/auth/login-code','POST',data);return confirmSession(result.user.id);}
  async function logout(){await request('/api/auth/logout','POST',{});profile=null;emit();}
  async function update(data){const result=await request('/api/account','PATCH',data);profile=result.user;emit();return current();}
  const ready=refresh();
  window.MoyuAccount={current,ready,refresh,register,login,loginCode,logout,update,sendCode:(email,purpose='register')=>request('/api/auth/code','POST',{email,purpose}),validName,validPassword,passwordHint,activityKey:key=>profile?`moyu:activity:user:${profile.id}:${key}`:`moyu:activity:${key}`,serviceStatus:()=>({available,emailAvailable})};
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
})();