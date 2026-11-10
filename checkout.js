(function(){
  'use strict';
  const {request,methods,money}=window.MoyuPayments;
  window.MoyuCheckout={async start(course){
    const form=document.querySelector('#checkout-form'),submit=form.querySelector('button[type="submit"]');
    const content=document.querySelector('#checkout-content'),qr=document.querySelector('#checkout-qr'),result=document.querySelector('#checkout-result');
    const feedback=document.querySelector('#payment-feedback'),login=document.querySelector('#checkout-login');
    const retry=document.querySelector('#retry-checkout');
    let active=null,timer=null,busy=false,config=null,pollStartedAt=0,initialized=false;
    document.title=`确认订单 · ${course.title} — 墨愚`;
    function message(text,error=false){
      feedback.textContent=text;
      feedback.classList.toggle('is-error',error);
    }
    function loading(value){
      busy=value;
      document.querySelector('#main').setAttribute('aria-busy',String(value));
      submit.disabled=value||!config?.purchasable||!window.MoyuAccount.current()||!form.querySelector('input[name="payment"]:checked:not(:disabled)');
      document.querySelector('#check-payment').disabled=value;
      document.querySelector('#close-payment').disabled=value;
    }
    function stage(name){
      content.hidden=name!=='form';qr.hidden=name!=='qr';result.hidden=name!=='result';
    }
    function stop(){clearTimeout(timer);timer=null;}
    function schedule(){
      stop();
      if(active?.status==='pending'&&!document.hidden)timer=setTimeout(()=>check(false),6000);
    }
    function render(order,focus=false){
      if(order.courseId!==course.id)throw new Error('订单与课程不匹配，请从购买记录重新进入。');
      active=order;
      document.querySelectorAll('[data-course-price]').forEach(element=>{element.textContent=money(order.amountCents);});
      if(order.status==='paid'){
        stop();stage('result');
        document.querySelector('#result-method').textContent=methods[order.provider];
        document.querySelector('#result-order-id').textContent=order.id;
        message('');
        if(focus)document.querySelector('#result-title').focus();
      }else if(order.status==='closed'){
        stop();stage('form');active=null;
        const url=new URL(location.href);url.searchParams.delete('order');history.replaceState(null,'',url);
        message('订单已关闭，可重新选择支付方式。');
      }else{
        stage('qr');
        document.querySelector('#qr-method').textContent=methods[order.provider];
        document.querySelector('#qr-order-id').textContent=order.id;
        const image=document.querySelector('#payment-qr-image');
        image.hidden=!order.qrDataURL||order.expiresAt<=Date.now();
        if(!image.hidden)image.src=order.qrDataURL;
        document.querySelector('#qr-expiry').textContent=`支付截止：${new Date(order.expiresAt).toLocaleString('zh-CN')}`;
        message(order.qrDataURL?'等待付款，状态将自动更新。':'二维码尚未生成，请查询或关闭订单后重试。');
        if(focus)document.querySelector('#qr-title').focus();
        schedule();
      }
    }
    async function check(manual=true){
      if(busy||!active)return;
      stop();loading(true);
      try{
        const data=await request(`/api/orders/${encodeURIComponent(active.id)}`);
        render(data.order,manual);
        if(active?.status==='pending'&&Date.now()-pollStartedAt>15*60000){
          stop();message('自动查询已暂停，请点击「查询支付结果」确认订单状态。');
        }
      }catch(error){
        stop();
        if(active?.expiresAt<=Date.now())document.querySelector('#payment-qr-image').hidden=true;
        message(error.message,true);
      }
      finally{loading(false);}
    }
    async function initialize(){
      stop();config=null;loading(true);retry.hidden=true;message('正在读取支付信息…');
      try{
        await window.MoyuAccount.ready;
        config=await request(`/api/payments/config?courseId=${encodeURIComponent(course.id)}`);
        form.querySelectorAll('input[name="payment"]').forEach(input=>{
          input.disabled=!config.methods.some(method=>method.id===input.value&&method.available);
          input.checked=false;
          input.closest('label').querySelector('small').textContent=input.disabled?'暂未开通':'';
        });
        const available=form.querySelector('input[name="payment"]:not(:disabled)');
        if(available)available.checked=true;
        if(!window.MoyuAccount.serviceStatus().available)throw new Error('账号服务连接失败，请稍后重试。');
        login.hidden=Boolean(window.MoyuAccount.current());
        if(!login.hidden){
          const target=new URL('account.html',location.href);target.searchParams.set('returnTo',location.pathname+location.search);
          login.href=target.href;
          message('登录后可创建订单并保存购买记录。');return;
        }
        const explicit=new URLSearchParams(location.search).get('order');
        const data=await request('/api/orders');
        const existing=explicit?data.orders.find(order=>order.id===explicit):data.orders.find(order=>order.courseId===course.id&&order.status==='pending');
        if(explicit&&!existing)throw new Error('订单不存在，请从购买记录重新进入。');
        if(existing){
          pollStartedAt=Date.now();
          const fresh=await request(`/api/orders/${encodeURIComponent(existing.id)}`);
          render(fresh.order);return;
        }
        const owned=await request('/api/purchases');
        if(owned.purchases.some(item=>item.courseId===course.id)){
          config.purchasable=false;message('你已购买这门课程，可在购买记录中查看。');return;
        }
        message(!available?'支付暂未开通，请稍后再试。':!config.purchasable?'该课程暂未开放购买。':'');
      }catch(error){config=null;message(error.message,true);retry.hidden=false;}
      finally{initialized=true;loading(false);}
    }
    form.addEventListener('change',()=>loading(busy));
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||submit.disabled)return;
      loading(true);message('正在创建订单，请勿重复提交…');
      try{
        const method=new FormData(form).get('payment');
        const data=await request('/api/orders','POST',{courseId:course.id,provider:method});
        const url=new URL(location.href);url.searchParams.set('order',data.order.id);history.replaceState(null,'',url);
        pollStartedAt=Date.now();render(data.order,true);
      }catch(error){message(error.message,true);retry.hidden=false;}
      finally{loading(false);}
    });
    document.querySelector('#check-payment').addEventListener('click',()=>check());
    document.querySelector('#close-payment').addEventListener('click',async()=>{
      if(busy||!active)return;
      stop();loading(true);
      try{const data=await request(`/api/orders/${encodeURIComponent(active.id)}/close`,'POST',{});render(data.order,true);}
      catch(error){message(error.message,true);}
      finally{loading(false);}
    });
    retry.addEventListener('click',initialize);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
    window.addEventListener('pagehide',stop);
    window.addEventListener('moyu:account-change',()=>{
      if(!initialized)return;
      stop();active=null;config=null;stage('form');
      login.hidden=Boolean(window.MoyuAccount.current());
      submit.disabled=true;
      message('账号状态已变化，请刷新支付信息后继续。');
      retry.hidden=false;
    });
    await initialize();
  }};
})();
