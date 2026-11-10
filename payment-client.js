(function(){
  'use strict';
  async function request(url,method='GET',data){
    let response;
    try{
      response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',
        headers:method==='GET'?{}:{'Content-Type':'application/json'},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(25000)});
    }catch{throw new Error('连接失败，请稍后查询订单，不要重复付款。');}
    let result;
    try{result=await response.json();}catch{throw new Error('订单服务响应异常，请稍后重试。');}
    if(!response.ok)throw new Error(result.error||'订单操作失败，请稍后重试。');
    return result;
  }
  const methods={wechat:'微信支付',alipay:'支付宝'};
  const money=cents=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'}).format(cents/100);
  window.MoyuPayments={request,methods,money};
})();
