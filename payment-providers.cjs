'use strict';
const fs=require('node:fs');
const {createPrivateKey,createPublicKey,sign,verify,randomBytes,createDecipheriv}=require('node:crypto');
const {AlipaySdk}=require('alipay-sdk');

function failure(status,message){return Object.assign(new Error(message),{status});}
function parseJSON(text){
  try{return JSON.parse(text);}catch{throw failure(400,'支付报文格式不正确。');}
}
function amountCents(value){
  if(typeof value!=='string'||!/^\d{1,9}(?:\.\d{1,2})?$/.test(value))throw failure(400,'支付金额格式不正确。');
  const [whole,fraction='']=value.split('.');
  return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
function validOrigin(origin){
  try{const url=new URL(origin);return url.protocol==='https:'&&url.origin===origin&&!url.username&&!url.password;}catch{return false;}
}
function keyFile(filename,privateKey=false){
  const key=fs.readFileSync(filename,'utf8');
  const parsed=privateKey?createPrivateKey(key):createPublicKey(key);
  if(parsed.asymmetricKeyType!=='rsa'||parsed.asymmetricKeyDetails.modulusLength<2048)throw new Error('支付密钥必须为 RSA 2048 位或以上。');
  return key;
}
function parseForm(raw){
  const params=new URLSearchParams(raw);
  const result=Object.create(null);
  for(const [key,value] of params){
    if(Object.hasOwn(result,key))throw failure(400,'支付通知包含重复字段。');
    result[key]=value;
  }
  return result;
}
function createWechatProvider(config,{fetchImpl=fetch,now=Date.now}={}){
  const {appId,mchId,serial,privateKey,publicKey,publicKeyId,apiV3Key,notifyURL}=config;
  function verifyMessage(headers,raw){
    const timestamp=headers['wechatpay-timestamp'],nonce=headers['wechatpay-nonce'];
    const signature=headers['wechatpay-signature'],keyId=headers['wechatpay-serial'];
    if(keyId!==publicKeyId||!/^\d+$/.test(timestamp||'')||Math.abs(now()/1000-Number(timestamp))>300||
       typeof nonce!=='string'||nonce.length>128||typeof signature!=='string'||
       !verify('RSA-SHA256',Buffer.from(`${timestamp}\n${nonce}\n${raw}\n`),publicKey,Buffer.from(signature,'base64'))){
      throw failure(400,'微信支付签名校验失败。');
    }
  }
  async function request(method,route,data){
    const raw=data?JSON.stringify(data):'';
    const timestamp=String(Math.floor(now()/1000)),nonce=randomBytes(16).toString('hex');
    const signature=sign('RSA-SHA256',Buffer.from(`${method}\n${route}\n${timestamp}\n${nonce}\n${raw}\n`),privateKey).toString('base64');
    let response;
    try{
      response=await fetchImpl(`https://api.mch.weixin.qq.com${route}`,{
        method,redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{Accept:'application/json','Content-Type':'application/json','Wechatpay-Serial':publicKeyId,
          Authorization:`WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serial}",signature="${signature}"`},
        ...(raw?{body:raw}:{})
      });
    }catch{throw failure(502,'无法连接微信支付，请稍后查询订单，不要重复付款。');}
    const text=await response.text();
    verifyMessage(Object.fromEntries(response.headers),text);
    if(!response.ok){
      const error=parseJSON(text);
      if(error.code==='ORDER_NOT_EXIST')return null;
      throw failure(502,'微信支付未完成请求，请稍后查询订单。');
    }
    return text?parseJSON(text):{};
  }
  function transaction(data){
    if(data.appid!==appId||data.mchid!==mchId||data.amount?.currency!=='CNY'||!Number.isSafeInteger(data.amount.total))throw failure(400,'微信支付商户或金额信息不匹配。');
    if(data.trade_state==='REFUND')throw failure(409,'订单已进入退款流程，请联系商户核对。');
    return {orderId:data.out_trade_no,transactionId:data.transaction_id,amountCents:data.amount.total,
      state:({SUCCESS:'paid',CLOSED:'closed',REVOKED:'closed',PAYERROR:'closed',NOTPAY:'pending',USERPAYING:'pending'})[data.trade_state]};
  }
  return {
    async create(order){
      const data=await request('POST','/v3/pay/transactions/native',{
        appid:appId,mchid:mchId,description:order.title,out_trade_no:order.id,
        time_expire:new Date(order.expiresAt).toISOString(),notify_url:notifyURL,amount:{total:order.amountCents,currency:'CNY'}
      });
      if(typeof data?.code_url!=='string'||!data.code_url.startsWith('weixin://wxpay/'))throw failure(502,'微信支付未返回有效二维码。');
      return data.code_url;
    },
    async query(order){
      const data=await request('GET',`/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.id)}?mchid=${encodeURIComponent(mchId)}`);
      return data?transaction(data):null;
    },
    async close(order){
      const result=await request('POST',`/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.id)}/close`,{mchid:mchId});
      if(result===null)throw failure(502,'微信订单尚未确认，请稍后重新查询。');
    },
    notify(raw,headers){
      verifyMessage(headers,raw);
      const message=parseJSON(raw);
      if(message.event_type!=='TRANSACTION.SUCCESS'||message.resource?.algorithm!=='AEAD_AES_256_GCM')throw failure(400,'不支持的微信支付通知。');
      const {ciphertext,nonce,associated_data=''}=message.resource;
      let data;
      try{
        const encrypted=Buffer.from(ciphertext,'base64');
        if(encrypted.length<16)throw new Error('Invalid GCM payload');
        const decipher=createDecipheriv('aes-256-gcm',Buffer.from(apiV3Key),Buffer.from(nonce),{authTagLength:16});
        decipher.setAuthTag(encrypted.subarray(-16));
        decipher.setAAD(Buffer.from(associated_data));
        data=JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]).toString());
      }catch{throw failure(400,'微信支付通知解密失败。');}
      const result=transaction(data);
      if(result.state!=='paid')throw failure(400,'微信通知状态不正确。');
      return result;
    }
  };
}
function createAlipayProvider(config,{sdk,fetchImpl=fetch}={}){
  const client=sdk||new AlipaySdk({
    appId:config.appId,privateKey:config.privateKey,alipayPublicKey:config.publicKey,
    keyType:config.privateKey.includes('BEGIN PRIVATE KEY')?'PKCS8':'PKCS1',
    signType:'RSA2',camelcase:false,timeout:15000,gateway:'https://openapi.alipay.com/gateway.do'
  });
  async function request(method,bizContent,notify=false){
    let data;
    try{
      // Reuse the official SDK's signer/verifier, but do not use its redirect-following HTTP transport.
      const signedURL=new URL(client.pageExec(method,'GET',{bizContent,...(notify?{notifyUrl:config.notifyURL}:{})}));
      if(signedURL.origin!=='https://openapi.alipay.com'||signedURL.pathname!=='/gateway.do')throw new Error('Invalid gateway');
      const response=await fetchImpl('https://openapi.alipay.com/gateway.do',{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded;charset=utf-8'},
        body:signedURL.searchParams.toString()
      });
      if(!response.ok)throw new Error('Gateway request failed');
      const raw=await response.text(),envelope=JSON.parse(raw);
      const key=`${method.replaceAll('.','_')}_response`;
      if(typeof envelope.sign!=='string'||!envelope.sign||!envelope[key])throw new Error('Unsigned response');
      client.checkResponseSign(raw,key,envelope.sign,'moyu');
      data=envelope[key];
    }catch{throw failure(502,'无法确认支付宝响应，请稍后查询订单，不要重复付款。');}
    if(data.code==='40004'&&data.sub_code==='ACQ.TRADE_NOT_EXIST')return null;
    if(data.code!=='10000')throw failure(502,'支付宝未完成请求，请稍后查询订单。');
    return data;
  }
  return {
    async create(order){
      const data=await request('alipay.trade.precreate',{
        out_trade_no:order.id,total_amount:(order.amountCents/100).toFixed(2),subject:order.title,
        seller_id:config.sellerId,timeout_express:'15m'
      },true);
      if(data?.out_trade_no!==order.id||typeof data.qr_code!=='string'||!/^https:\/\/qr\.alipay\.com\/[A-Za-z0-9/?=&_-]+$/.test(data.qr_code))throw failure(502,'支付宝未返回有效二维码。');
      return data.qr_code;
    },
    async query(order){
      const data=await request('alipay.trade.query',{out_trade_no:order.id});
      if(!data)return null;
      return {orderId:data.out_trade_no,transactionId:data.trade_no,amountCents:amountCents(data.total_amount),
        state:({WAIT_BUYER_PAY:'pending',TRADE_CLOSED:'closed',TRADE_SUCCESS:'paid',TRADE_FINISHED:'paid'})[data.trade_status]};
    },
    async close(order){
      const data=await request('alipay.trade.close',{out_trade_no:order.id});
      if(!data||data.out_trade_no!==order.id)throw failure(502,'支付宝订单尚未确认，请稍后重新查询。');
    },
    notify(raw){
      const data=parseForm(raw);
      if(data.sign_type!=='RSA2'||!client.checkNotifySignV2(data))throw failure(400,'支付宝签名校验失败。');
      if(data.app_id!==config.appId||data.seller_id!==config.sellerId)throw failure(400,'支付宝商户信息不匹配。');
      const state=({WAIT_BUYER_PAY:'pending',TRADE_CLOSED:'closed',TRADE_SUCCESS:'paid',TRADE_FINISHED:'paid'})[data.trade_status];
      if(!state)throw failure(400,'支付宝交易状态不正确。');
      return {orderId:data.out_trade_no,transactionId:data.trade_no,amountCents:amountCents(data.total_amount),state};
    }
  };
}
function configuredProviders(env,origin){
  const providers={};
  for(const name of ['wechat','alipay']){
    const fields=name==='wechat'
      ?['WECHAT_APP_ID','WECHAT_MCH_ID','WECHAT_CERT_SERIAL','WECHAT_PRIVATE_KEY_PATH','WECHAT_PUBLIC_KEY_ID','WECHAT_PUBLIC_KEY_PATH','WECHAT_API_V3_KEY']
      :['ALIPAY_APP_ID','ALIPAY_SELLER_ID','ALIPAY_PRIVATE_KEY_PATH','ALIPAY_PUBLIC_KEY_PATH'];
    if(!fields.some(field=>env[field]))continue;
    if(fields.some(field=>!env[field])||!validOrigin(origin)){
      console.error(`[payments] ${name}: 配置不完整或 PUBLIC_ORIGIN 不是 HTTPS，支付未启用。`);
      continue;
    }
    try{
      if(name==='wechat'){
        if(Buffer.byteLength(env.WECHAT_API_V3_KEY)!==32)throw new Error('API v3 密钥必须为32字节。');
        providers.wechat=createWechatProvider({
          appId:env.WECHAT_APP_ID,mchId:env.WECHAT_MCH_ID,serial:env.WECHAT_CERT_SERIAL,
          privateKey:keyFile(env.WECHAT_PRIVATE_KEY_PATH,true),publicKey:keyFile(env.WECHAT_PUBLIC_KEY_PATH),
          publicKeyId:env.WECHAT_PUBLIC_KEY_ID,apiV3Key:env.WECHAT_API_V3_KEY,notifyURL:`${origin}/api/payments/notify/wechat`
        });
      }else{
        providers.alipay=createAlipayProvider({
          appId:env.ALIPAY_APP_ID,sellerId:env.ALIPAY_SELLER_ID,
          privateKey:keyFile(env.ALIPAY_PRIVATE_KEY_PATH,true),publicKey:keyFile(env.ALIPAY_PUBLIC_KEY_PATH),
          notifyURL:`${origin}/api/payments/notify/alipay`
        });
      }
    }catch{
      console.error(`[payments] ${name}: 密钥配置无法读取或无效，支付未启用。`);
    }
  }
  return providers;
}
module.exports={configuredProviders,createWechatProvider,createAlipayProvider,amountCents,failure};
