'use strict';
const {randomBytes}=require('node:crypto');
const QRCode=require('qrcode');
const courses=require('./course-data.js');
const {failure}=require('./payment-providers.cjs');

function createPayments({db,providers,enabledCourseIds=[],now=Date.now}){
  const enabled=new Set(enabledCourseIds.filter(id=>!id.endsWith('-demo')&&courses.some(course=>course.id===id)));
  const methods=['wechat','alipay'];
  const locks=new Map();
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders(
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL,
      title TEXT NOT NULL,amount_cents INTEGER NOT NULL CHECK(amount_cents>0),provider TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','paid','closed')),
      code_url TEXT NOT NULL DEFAULT '',transaction_id TEXT,
      created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,paid_at INTEGER,last_checked INTEGER NOT NULL DEFAULT 0,
      UNIQUE(provider,transaction_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS payment_active_course ON payment_orders(user_id,course_id) WHERE status='pending';
    CREATE INDEX IF NOT EXISTS payment_user_orders ON payment_orders(user_id,created_at);
    CREATE TABLE IF NOT EXISTS course_purchases(
      user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE REFERENCES payment_orders(id),purchased_at INTEGER NOT NULL,
      PRIMARY KEY(user_id,course_id)
    );`);
  const get=id=>db.prepare('SELECT * FROM payment_orders WHERE id=?').get(id);
  function publicOrder(row){
    return {id:row.id,courseId:row.course_id,title:row.title,amountCents:row.amount_cents,
      provider:row.provider,status:row.status,createdAt:row.created_at,expiresAt:row.expires_at,paidAt:row.paid_at};
  }
  function providerOrder(row){
    return {id:row.id,title:row.title,amountCents:row.amount_cents,expiresAt:row.expires_at};
  }
  function own(userId,id){
    const row=typeof id==='string'?get(id):null;
    if(!row||row.user_id!==userId)throw failure(404,'订单不存在。');
    return row;
  }
  async function locked(key,fn){
    if(locks.has(key))throw failure(409,'订单正在处理中，请稍后查询。');
    locks.set(key,true);
    try{return await fn();}finally{locks.delete(key);}
  }
  function providerFor(name){
    if(!methods.includes(name))throw failure(400,'支付方式不正确。');
    if(!providers[name])throw failure(503,'支付暂未开通，请稍后再试。');
    return providers[name];
  }
  function apply(name,transaction){
    const row=get(transaction.orderId);
    if(!row||row.provider!==name||row.amount_cents!==transaction.amountCents||
       !['pending','paid','closed'].includes(transaction.state))throw failure(400,'支付通知与订单不匹配。');
    if(transaction.state==='paid'){
      if(typeof transaction.transactionId!=='string'||!transaction.transactionId||transaction.transactionId.length>128)throw failure(400,'支付交易号无效。');
      if(row.status==='paid'){
        if(row.transaction_id!==transaction.transactionId)throw failure(409,'订单交易号冲突。');
        return;
      }
      db.exec('BEGIN IMMEDIATE');
      try{
        db.prepare("UPDATE payment_orders SET status='paid',transaction_id=?,paid_at=? WHERE id=?").run(transaction.transactionId,now(),row.id);
        db.prepare('INSERT OR IGNORE INTO course_purchases(user_id,course_id,order_id,purchased_at) VALUES(?,?,?,?)').run(row.user_id,row.course_id,row.id,now());
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
    }else if(transaction.state==='closed'&&row.status==='pending'){
      db.prepare("UPDATE payment_orders SET status='closed',code_url='' WHERE id=? AND status='pending'").run(row.id);
    }
  }
  async function reconcile(row,force=false){
    if(row.status!=='pending')return row;
    const provider=providerFor(row.provider);
    if(!force&&row.last_checked&&now()-row.last_checked<5000)return row;
    const state=await provider.query(providerOrder(row));
    if(state){
      if(state.orderId!==row.id)throw failure(400,'支付查单结果与请求的订单不匹配。');
      apply(row.provider,state);
    }
    row=get(row.id);
    if(row.status==='pending'&&row.expires_at<=now()){
      if(state)await provider.close(providerOrder(row));
      db.prepare("UPDATE payment_orders SET status='closed',code_url='' WHERE id=? AND status='pending'").run(row.id);
    }
    db.prepare('UPDATE payment_orders SET last_checked=? WHERE id=?').run(now(),row.id);
    return get(row.id);
  }
  async function response(row){
    const order=publicOrder(row);
    // QR data is returned only to the authenticated owner, never as a public asset.
    if(row.status==='pending'&&row.expires_at>now()&&row.code_url){
      order.qrDataURL=await QRCode.toDataURL(row.code_url,{width:280,margin:4,errorCorrectionLevel:'M'});
    }
    return order;
  }
  return {
    config(courseId){
      return {methods:methods.map(id=>({id,available:Boolean(providers[id])})),
        purchasable:enabled.has(courseId)&&courses.some(course=>course.id===courseId),loginRequired:true};
    },
    async create(userId,data){
      if(!data||Object.keys(data).some(key=>!['courseId','provider'].includes(key)))throw failure(400,'订单仅接受课程和支付方式，金额由服务端确定。');
      const course=courses.find(item=>item.id===data.courseId);
      if(!course)throw failure(404,'课程不存在。');
      const provider=providerFor(data.provider);
      if(!enabled.has(course.id))throw failure(409,'该课程暂未开放购买。');
      return locked(`${userId}:${course.id}`,async()=>{
        if(db.prepare('SELECT order_id FROM course_purchases WHERE user_id=? AND course_id=?').get(userId,course.id))throw failure(409,'你已购买这门课程，请查看购买记录。');
        let row=db.prepare("SELECT * FROM payment_orders WHERE user_id=? AND course_id=? AND status='pending'").get(userId,course.id);
        if(row){
          return locked(row.id,async()=>{
            row=await reconcile(row,true);
            if(row.status==='paid')return response(row);
            if(row.status==='closed')throw failure(409,'旧订单已关闭，请重新确认支付。');
            if(row.provider!==data.provider)throw failure(409,'请先关闭当前订单，再更换支付方式。');
            if(!row.code_url){
              const code=await provider.create(providerOrder(row));
              db.prepare("UPDATE payment_orders SET code_url=? WHERE id=? AND status='pending'").run(code,row.id);
            }
            return response(get(row.id));
          });
        }
        const id=`MY${randomBytes(15).toString('hex')}`;
        const createdAt=now(),expiresAt=createdAt+15*60000;
        db.prepare("INSERT INTO payment_orders(id,user_id,course_id,title,amount_cents,provider,status,created_at,expires_at) VALUES(?,?,?,?,?,?,'pending',?,?)")
          .run(id,userId,course.id,course.title,course.priceCents,data.provider,createdAt,expiresAt);
        return locked(id,async()=>{
          // Persist before the network call: a timeout must reuse this ID rather than charge a second order.
          row=get(id);
          const code=await provider.create(providerOrder(row));
          db.prepare("UPDATE payment_orders SET code_url=? WHERE id=? AND status='pending'").run(code,id);
          return response(get(id));
        });
      });
    },
    async read(userId,id){
      const row=own(userId,id);
      return locked(row.id,async()=>response(await reconcile(own(userId,id))));
    },
    async close(userId,id){
      const row=own(userId,id);
      return locked(row.id,async()=>{
        let current=own(userId,id);
        if(current.status==='pending'){
          const provider=providerFor(current.provider);
          const state=await provider.query(providerOrder(current));
          if(state){
            if(state.orderId!==current.id)throw failure(400,'支付查单结果与请求的订单不匹配。');
            apply(current.provider,state);
          }
          current=get(id);
          if(current.status==='pending'){
            if(state)await provider.close(providerOrder(current));
            db.prepare("UPDATE payment_orders SET status='closed',code_url='' WHERE id=? AND status='pending'").run(id);
          }
        }
        current=get(id);
        return response(current);
      });
    },
    list(userId){
      return db.prepare('SELECT * FROM payment_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(userId).map(publicOrder);
    },
    purchases(userId){
      return db.prepare('SELECT course_id AS courseId,order_id AS orderId,purchased_at AS purchasedAt FROM course_purchases WHERE user_id=? ORDER BY purchased_at DESC').all(userId);
    },
    async notify(name,raw,headers){
      const provider=providerFor(name);
      const transaction=await provider.notify(raw,headers);
      apply(name,transaction);
    }
  };
}
module.exports={createPayments};
