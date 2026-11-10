'use strict';
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign,verify,createCipheriv}=require('node:crypto');
const {AlipaySdk}=require('alipay-sdk');
const {createWechatProvider,createAlipayProvider,configuredProviders,amountCents}=require('../payment-providers.cjs');

function keys(){return generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});}
(async()=>{
  const merchant=keys(),platform=keys(),now=Date.now();
  const config={appId:'wx-app',mchId:'1234567890',serial:'MERCHANT_SERIAL',privateKey:merchant.privateKey,
    publicKey:platform.publicKey,publicKeyId:'PUB_KEY_ID_1',apiV3Key:'a'.repeat(32),notifyURL:'https://shop.example/api/payments/notify/wechat'};
  const order={id:'MY'+'a'.repeat(30),title:'小观红楼',amountCents:360000,expiresAt:now+900000};
  function signedHeaders(text,overrides={}){
    const timestamp=String(Math.floor(now/1000)),nonce='platform-nonce';
    return {'wechatpay-timestamp':timestamp,'wechatpay-nonce':nonce,'wechatpay-serial':config.publicKeyId,
      'wechatpay-signature':sign('RSA-SHA256',Buffer.from(`${timestamp}\n${nonce}\n${text}\n`),platform.privateKey).toString('base64'),...overrides};
  }
  const transaction={appid:config.appId,mchid:config.mchId,out_trade_no:order.id,transaction_id:'wx-transaction',
    trade_state:'SUCCESS',amount:{total:360000,currency:'CNY'}};
  let answer={code_url:'weixin://wxpay/bizpayurl?pr=test'},status=200,tamper=false,calls=0;
  const wx=createWechatProvider(config,{now:()=>now,fetchImpl:async(url,options)=>{
    calls++;
    const route=url.replace('https://api.mch.weixin.qq.com','');
    const auth=Object.fromEntries([...options.headers.Authorization.matchAll(/([a-z_]+)="([^"]+)"/g)].map(match=>[match[1],match[2]]));
    assert.equal(auth.mchid,config.mchId);assert.equal(auth.serial_no,config.serial);
    assert.equal(options.headers['Wechatpay-Serial'],config.publicKeyId);
    assert.equal(options.redirect,'error');
    assert.equal(verify('RSA-SHA256',Buffer.from(`${options.method}\n${route}\n${auth.timestamp}\n${auth.nonce_str}\n${options.body||''}\n`),merchant.publicKey,Buffer.from(auth.signature,'base64')),true);
    if(route==='/v3/pay/transactions/native'){
      const body=JSON.parse(options.body);assert.equal(body.amount.total,360000);assert.equal(body.notify_url,config.notifyURL);
      assert.equal(body.time_expire,new Date(order.expiresAt).toISOString());
    }
    const text=status===204?'':JSON.stringify(answer),headers=signedHeaders(text);
    return {ok:status<300,status,headers:new Headers(headers),text:async()=>tamper?text+' ':text};
  }});
  assert.match(await wx.create(order),/^weixin:/);
  answer=transaction;assert.deepEqual(await wx.query(order),{orderId:order.id,transactionId:'wx-transaction',amountCents:360000,state:'paid'});
  answer={...transaction,mchid:'wrong'};
  await assert.rejects(wx.query(order),/商户或金额/);
  answer={...transaction,trade_state:'REFUND'};
  await assert.rejects(wx.query(order),/退款/);
  answer=transaction;tamper=true;await assert.rejects(wx.query(order),/签名/);tamper=false;
  status=404;answer={code:'ORDER_NOT_EXIST'};assert.equal(await wx.query(order),null);
  status=204;await wx.close(order);status=200;
  const nonce='123456789012',aad='transaction';
  const cipher=createCipheriv('aes-256-gcm',Buffer.from(config.apiV3Key),Buffer.from(nonce));cipher.setAAD(Buffer.from(aad));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(transaction)),cipher.final(),cipher.getAuthTag()]).toString('base64');
  const raw=JSON.stringify({event_type:'TRANSACTION.SUCCESS',resource:{algorithm:'AEAD_AES_256_GCM',nonce,associated_data:aad,ciphertext:encrypted}});
  assert.equal(wx.notify(raw,signedHeaders(raw)).state,'paid');
  assert.throws(()=>wx.notify(raw,signedHeaders(raw,{'wechatpay-serial':'OTHER'})),/签名/);
  assert.throws(()=>wx.notify(raw,signedHeaders(raw,{'wechatpay-timestamp':'1'})),/签名/);
  assert.throws(()=>wx.notify(raw+' ',signedHeaders(raw)),/签名/);
  const broken=JSON.stringify({event_type:'TRANSACTION.SUCCESS',resource:{algorithm:'AEAD_AES_256_GCM',nonce,ciphertext:'broken'}});
  assert.throws(()=>wx.notify(broken,signedHeaders(broken)),/解密/);
  assert.ok(calls>=5);

  const aliConfig={appId:'ali-app',sellerId:'2088000000000000',privateKey:merchant.privateKey,publicKey:platform.publicKey,notifyURL:'https://shop.example/api/payments/notify/alipay'};
  const sdk=new AlipaySdk({appId:aliConfig.appId,privateKey:merchant.privateKey,alipayPublicKey:platform.publicKey,keyType:'PKCS8',signType:'RSA2',camelcase:false});
  let aliResult={code:'10000',out_trade_no:order.id,qr_code:'https://qr.alipay.com/test123'};
  let badAliSign=false;
  const ali=createAlipayProvider(aliConfig,{sdk,fetchImpl:async(url,options)=>{
    assert.equal(url,'https://openapi.alipay.com/gateway.do');
    assert.equal(options.redirect,'error');
    const params=Object.fromEntries(new URLSearchParams(options.body)),method=params.method;
    const biz=JSON.parse(params.biz_content);
    assert.equal(biz.out_trade_no,order.id);
    const signatureText=Object.keys(params).sort().filter(key=>key!=='sign'&&params[key]!=='').map(key=>`${key}=${params[key]}`).join('&');
    assert.equal(verify('RSA-SHA256',Buffer.from(signatureText),merchant.publicKey,Buffer.from(params.sign,'base64')),true);
    if(method==='alipay.trade.precreate'){
      assert.equal(params.notify_url,aliConfig.notifyURL);
      assert.equal(biz.total_amount,'3600.00');
      assert.equal(biz.seller_id,aliConfig.sellerId);
    }
    const key=method.replaceAll('.','_')+'_response';
    const text=JSON.stringify(aliResult);
    const signature=sign('RSA-SHA256',Buffer.from(text),platform.privateKey).toString('base64');
    return {ok:true,text:async()=>`{"${key}":${text},"sign":"${badAliSign?'bad':signature}"}`};
  }});
  assert.equal(await ali.create(order),'https://qr.alipay.com/test123');
  badAliSign=true;await assert.rejects(ali.create(order),/无法确认/);badAliSign=false;
  aliResult={code:'10000',out_trade_no:order.id,total_amount:'3600.00',trade_no:'ali-transaction',trade_status:'TRADE_SUCCESS'};
  assert.deepEqual(await ali.query(order),{orderId:order.id,transactionId:'ali-transaction',amountCents:360000,state:'paid'});
  aliResult={code:'40004',sub_code:'ACQ.TRADE_NOT_EXIST'};assert.equal(await ali.query(order),null);
  aliResult={code:'10000',out_trade_no:order.id};await ali.close(order);
  function aliNotification(overrides={}){
    const fields={app_id:aliConfig.appId,seller_id:aliConfig.sellerId,out_trade_no:order.id,trade_no:'ali-transaction',
      total_amount:'3600.00',trade_status:'TRADE_SUCCESS',subject:'课程 + 阅读 & 问题',...overrides};
    const text=Object.keys(fields).sort().filter(key=>fields[key]!=='').map(key=>`${key}=${fields[key]}`).join('&');
    return new URLSearchParams({...fields,sign_type:'RSA2',sign:sign('RSA-SHA256',Buffer.from(text),platform.privateKey).toString('base64')}).toString();
  }
  assert.equal(ali.notify(aliNotification()).amountCents,360000);
  assert.throws(()=>ali.notify(aliNotification({seller_id:'wrong'})),/商户/);
  assert.throws(()=>ali.notify(aliNotification({app_id:'wrong'})),/商户/);
  assert.throws(()=>ali.notify(aliNotification().replace('3600.00','1.00')),/签名/);
  assert.throws(()=>ali.notify(aliNotification()+'&total_amount=1.00'),/重复/);
  assert.equal(ali.notify(aliNotification({trade_status:'TRADE_CLOSED'})).state,'closed');
  assert.throws(()=>ali.notify(aliNotification({trade_status:'UNKNOWN'})),/状态/);
  assert.equal(amountCents('0.01'),1);assert.equal(amountCents('3600'),360000);
  for(const amount of ['NaN','-1','1e3','1.001','Infinity'])assert.throws(()=>amountCents(amount));
  assert.deepEqual(configuredProviders({},''),{});
  console.log('PASS: WeChat request signing, signed response verification, timestamp/key-ID checks, AES-GCM callback decryption; Alipay SDK RSA2 response and form notification verification, identity and amount parsing. Generated keys only; no external payment calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
