(async function(){
  'use strict';
  const {request,methods,money}=window.MoyuPayments;
  const feedback=document.querySelector('#orders-feedback'),list=document.querySelector('#orders-list');
  const refresh=document.querySelector('#orders-refresh'),login=document.querySelector('#orders-login');
  let busy=false;
  function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
  async function load(){
    if(busy)return;
    busy=true;refresh.disabled=true;list.replaceChildren();feedback.textContent='正在读取购买记录…';
    try{
      await window.MoyuAccount.ready;
      if(!window.MoyuAccount.serviceStatus().available)throw new Error('账号服务连接失败，请稍后重试。');
      login.hidden=Boolean(window.MoyuAccount.current());
      if(!login.hidden){feedback.textContent='登录后查看购买记录。';return;}
      const {orders}=await request('/api/orders');
      feedback.textContent=orders.length?'':'暂无购买记录。';
      for(const order of orders){
        const card=node('article','');card.className='order-card';
        const heading=node('h2',order.title),status=node('p',({paid:'已支付',pending:'待支付',closed:'已关闭'})[order.status]);
        const amount=node('p',`${money(order.amountCents)} · ${methods[order.provider]}`);
        const id=node('p',order.id);id.className='order-number';
        const date=node('p',new Date(order.createdAt).toLocaleString('zh-CN'));date.className='course-muted';
        const link=node('a',order.status==='pending'?'查看支付状态':'课程详情');link.className='text-link';
        link.href=order.status==='pending'?`checkout.html?id=${encodeURIComponent(order.courseId)}&order=${encodeURIComponent(order.id)}`:`course.html?id=${encodeURIComponent(order.courseId)}`;
        card.append(heading,status,amount,date,id,link);list.append(card);
      }
    }catch(error){feedback.textContent=error.message;}
    finally{busy=false;refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);
  window.addEventListener('moyu:account-change',()=>{
    list.replaceChildren();feedback.textContent='账号状态已变化，请刷新记录。';
  });
  await load();
})();
