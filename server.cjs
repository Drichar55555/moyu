'use strict';
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const {DatabaseSync} = require('node:sqlite');
const {randomBytes,randomInt,randomUUID,createHash,scrypt:rawScrypt,timingSafeEqual} = require('node:crypto');
const {promisify} = require('node:util');
const nodemailer = require('nodemailer');
const scrypt = promisify(rawScrypt);
const ROOT=__dirname;
const digest=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>typeof s==='string'?s.trim().toLowerCase():'';
const validEmail=s=>s.length<=254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(s);
const validName=s=>typeof s==='string' && /^[\p{L}\p{N}_ ·-]{1,24}$/u.test(s) && s.trim()===s && s.length>0;
const validPassword=s=>typeof s==='string' && s.length>=8 && s.length<=128;
function failure(code,message){const e=new Error(message);e.status=code;return e;}
function smtpSender(env){
  if(!env.SMTP_HOST||!env.SMTP_FROM)return null;
  const secure=env.SMTP_SECURE==='true';
  const transport=nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT|| (secure?465:587)),secure,requireTLS:!secure,auth:env.SMTP_USER?{user:env.SMTP_USER,pass:env.SMTP_PASS}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  return async ({email,code,purpose='register'})=>{
    const label=purpose==='login'?'登录':'注册';
    const result=await transport.sendMail({from:env.SMTP_FROM,to:{address:email,name:''},subject:`墨愚 · ${label}邮箱验证码`,text:`你的墨愚${label}验证码是：${code}\n\n10 分钟内有效，仅限本次${label}，请勿转发。\n如果不是你本人操作，请忽略此邮件。`});
    if(!result.accepted?.length)throw new Error('SMTP rejected');
  };
}
// Tests inject an in-memory mail sink; no HTTP endpoint exposes verification codes.
function createMoyuServer({dbPath=path.join(ROOT,'.data','moyu.sqlite'),sendMail=smtpSender(process.env),publicOrigin=process.env.PUBLIC_ORIGIN||'',now=Date.now}={}){
  if(dbPath!==':memory:')fs.mkdirSync(path.dirname(dbPath),{recursive:true,mode:0o700});
  const db=new DatabaseSync(dbPath);
  if(dbPath!==':memory:')fs.chmodSync(dbPath,0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,handle TEXT UNIQUE NOT NULL,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,avatar TEXT NOT NULL DEFAULT '',tone TEXT NOT NULL DEFAULT 'ink');
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY,email TEXT NOT NULL,code_hash TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,ready INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);`);
  // Preserve existing accounts and pending registration codes during upgrade.
  if(!db.prepare('PRAGMA table_info(challenges)').all().some(column=>column.name==='purpose'))db.exec("ALTER TABLE challenges ADD COLUMN purpose TEXT NOT NULL DEFAULT 'register'");
  function limit(key,max,windowMs){
    const t=now(),old=db.prepare('SELECT * FROM limits WHERE key=?').get(key);
    if(old&&old.reset>t){if(old.count>=max)throw failure(429,'操作过于频繁，请稍后再试。');db.prepare('UPDATE limits SET count=count+1 WHERE key=?').run(key);}
    else db.prepare('INSERT OR REPLACE INTO limits VALUES(?,1,?)').run(key,t+windowMs);
  }
  function clean(){const t=now();db.prepare('DELETE FROM sessions WHERE expires<=?').run(t);db.prepare('DELETE FROM challenges WHERE expires<=?').run(t);db.prepare('DELETE FROM limits WHERE reset<=?').run(t);}
  function publicUser(row){return row?{id:row.id,handle:row.handle,name:row.name,email:row.email,emailVerified:true,avatar:row.avatar,tone:row.tone}:null;}
  function verifyCode(data,purpose){
    const email=normalize(data.email);
    if(!validEmail(email)||typeof data.code!=='string'||!/^\d{6}$/.test(data.code)||typeof data.challengeId!=='string')throw failure(400,'请填写邮箱和收到的 6 位验证码。');
    const challenge=db.prepare('SELECT * FROM challenges WHERE id=?').get(data.challengeId);
    if(!challenge||challenge.email!==email||challenge.purpose!==purpose||!challenge.ready||challenge.used||challenge.expires<=now()||challenge.attempts>=5)throw failure(400,'验证码无效或已过期，请重新获取。');
    if(!timingSafeEqual(Buffer.from(challenge.code_hash,'hex'),Buffer.from(digest(challenge.id+':'+data.code),'hex'))){db.prepare('UPDATE challenges SET attempts=attempts+1 WHERE id=?').run(challenge.id);throw failure(400,'验证码不正确，请核对邮件；连续错误 5 次需重新获取。');}
    return challenge;
  }
  function session(req){
    const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('moyu_session='))?.slice(13);
    if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
    return db.prepare('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(digest(raw),now())||null;
  }
  function sessionCookie(token,expires=7*86400){return `moyu_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${expires}${publicOrigin.startsWith('https://')?'; Secure':''}`;}
  function newSession(userId,res,req){
    const old=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('moyu_session='))?.slice(13);
    if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(old));
    const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),userId,now()+7*86400*1000);res.setHeader('Set-Cookie',sessionCookie(token));
  }
  function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
  async function body(req){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw failure(415,'请求格式不正确。');
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>220000)throw failure(413,'请求内容过大。');chunks.push(chunk);}
    try{const data=JSON.parse(Buffer.concat(chunks).toString());if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data;}catch{throw failure(400,'请求内容无法读取。');}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    try{
      const host=req.headers.host||'';
      if(!publicOrigin&&!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))throw failure(403,'访问域名未配置。');
      if(publicOrigin&&host!==new URL(publicOrigin).host)throw failure(403,'访问域名不匹配。');
      const origin=publicOrigin||`http://${host}`;
      const url=new URL(req.url,origin);
      if(url.pathname.startsWith('/api/')){
        clean();const ip=req.socket.remoteAddress||'unknown';
        if(req.method!=='GET'&&req.headers.origin!==origin)throw failure(403,'请求来源无效，请从本站重新操作。');
        if(req.method==='GET'&&url.pathname==='/api/auth/session'){json(res,200,{user:publicUser(session(req)),emailRegistrationAvailable:Boolean(sendMail)});return;}
        if(req.method==='POST'&&url.pathname==='/api/auth/code'){
          const data=await body(req);const email=normalize(data.email),purpose=data.purpose??'register';
          if(!['register','login'].includes(purpose))throw failure(400,'验证码用途不正确。');
          if(!validEmail(email))throw failure(400,'请输入有效的邮箱地址。');
          if(!sendMail)throw failure(503,'邮箱服务尚未配置，暂时无法发送验证码。请联系网站管理员配置邮件服务；已有账号可使用密码登录。');
          limit(`send-ip:${ip}`,10,3600000);limit(`send-email-hour:${digest(email)}`,5,3600000);limit(`send-email-cooldown:${digest(email)}`,1,60000);
          const id=randomBytes(24).toString('hex'),code=String(randomInt(0,1000000)).padStart(6,'0');
          const message=purpose==='login'?'如果该邮箱已注册，登录验证码已发送，请查收邮箱（10 分钟内有效）。':'验证码已发送，请查收邮箱（10 分钟内有效）。';
          if(purpose==='login'&&!db.prepare('SELECT id FROM users WHERE email=?').get(email)){json(res,200,{challengeId:id,retryAfter:60,message});return;}
          db.prepare('INSERT INTO challenges(id,email,code_hash,expires,purpose) VALUES(?,?,?,?,?)').run(id,email,digest(id+':'+code),now()+600000,purpose);
          try{await sendMail({email,code,purpose});}catch{db.prepare('DELETE FROM challenges WHERE id=?').run(id);throw failure(502,'邮件未发送成功，请稍后重试。');}
          db.prepare('DELETE FROM challenges WHERE email=? AND purpose=? AND id<>?').run(email,purpose,id);
          db.prepare('UPDATE challenges SET ready=1 WHERE id=?').run(id);
          json(res,200,{challengeId:id,retryAfter:60,message});return;
        }
        if(req.method==='POST'&&url.pathname==='/api/auth/register'){
          limit(`register:${ip}`,30,900000);
          const data=await body(req),handle=normalize(data.handle),name=typeof data.name==='string'?data.name.trim():'',email=normalize(data.email);
          if(!handle||handle.length>64||/[\u0000-\u001f\u007f]/.test(handle))throw failure(400,'登录账号需为 1—64 个字符，可使用中文。');
          if(!validName(name))throw failure(400,'用户名需为 1—24 个文字、数字、空格、点、横线或下划线。');
          if(!validPassword(data.password))throw failure(400,'密码 8—128 位即可，不限制字符组合。');
          let challenge=verifyCode(data,'register');
          if(db.prepare('SELECT id FROM users WHERE handle=? OR email=?').get(handle,email))throw failure(409,'该账号或邮箱已注册，请直接登录或更换。');
          const salt=randomBytes(16).toString('hex');const hash=(await scrypt(data.password,salt,64)).toString('hex');
          db.exec('BEGIN IMMEDIATE');
          try{
            challenge=db.prepare('SELECT * FROM challenges WHERE id=?').get(data.challengeId);
            if(!challenge||challenge.used||challenge.expires<=now()||challenge.attempts>=5)throw failure(400,'验证码已使用或已过期，请重新获取。');
            const id=randomUUID();db.prepare('INSERT INTO users(id,handle,name,email,salt,password_hash) VALUES(?,?,?,?,?,?)').run(id,handle,name,email,salt,hash);
            db.prepare('UPDATE challenges SET used=1 WHERE id=?').run(challenge.id);
            newSession(id,res,req);db.exec('COMMIT');json(res,201,{user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id))});return;
          }catch(e){db.exec('ROLLBACK');if(e.code?.startsWith('SQLITE_CONSTRAINT'))throw failure(409,'该账号或邮箱已注册。');throw e;}
        }
        if(req.method==='POST'&&url.pathname==='/api/auth/login'){
          limit(`login-ip:${ip}`,40,900000);const data=await body(req);const rawIdentifier=typeof (data.identifier??data.handle)==='string'?(data.identifier??data.handle).trim():'';const identifier=normalize(rawIdentifier);limit(`login-handle:${digest(identifier)}`,15,900000);
          if(!identifier||identifier.length>254)throw failure(400,'请输入完整邮箱、登录账号或用户名。');
          if(typeof data.password!=='string'||data.password.length>128)throw failure(400,'账号或密码不正确。');
          const candidates=validEmail(identifier)?db.prepare('SELECT * FROM users WHERE email=?').all(identifier):db.prepare('SELECT * FROM users WHERE handle=? OR name=? COLLATE NOCASE').all(identifier,rawIdentifier);
          if(candidates.length>1)throw failure(409,'该用户名对应多个账号，请使用注册邮箱登录。');
          const user=candidates[0];const hash=await scrypt(data.password,user?.salt||'00'.repeat(16),64);
          if(!user||!timingSafeEqual(hash,Buffer.from(user.password_hash,'hex')))throw failure(401,'账号或密码不正确。旧版本地 Demo 账号需先用邮箱验证重新注册。');
          newSession(user.id,res,req);json(res,200,{user:publicUser(user)});return;
        }
        if(req.method==='POST'&&url.pathname==='/api/auth/login-code'){
          limit(`login-code-ip:${ip}`,30,900000);const data=await body(req);limit(`login-code-email:${digest(normalize(data.email))}`,15,900000);
          const challenge=verifyCode(data,'login');const user=db.prepare('SELECT * FROM users WHERE email=?').get(challenge.email);
          if(!user)throw failure(400,'验证码无效或已过期，请重新获取。');
          db.exec('BEGIN IMMEDIATE');
          try{const consumed=db.prepare('UPDATE challenges SET used=1 WHERE id=? AND used=0 AND expires>? AND attempts<5').run(challenge.id,now());if(consumed.changes!==1)throw failure(400,'验证码已使用，请重新获取。');newSession(user.id,res,req);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
          json(res,200,{user:publicUser(user)});return;
        }
        if(req.method==='POST'&&url.pathname==='/api/auth/logout'){
          await body(req);const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('moyu_session='))?.slice(13);if(raw)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(raw));res.setHeader('Set-Cookie',sessionCookie('',0));json(res,200,{ok:true});return;
        }
        if(req.method==='PATCH'&&url.pathname==='/api/account'){
          const user=session(req);if(!user)throw failure(401,'登录已失效，请重新登录。');const data=await body(req);const name=typeof data.name==='string'?data.name.trim():'';
          if(!validName(name))throw failure(400,'用户名格式不正确。');
          if(typeof data.avatar!=='string'||data.avatar.length>=180000||(data.avatar!==''&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.avatar))||!['ink','clay','moss','sand'].includes(data.tone))throw failure(400,'头像格式不正确，请重新上传。');
          db.prepare('UPDATE users SET name=?,avatar=?,tone=? WHERE id=?').run(name,data.avatar,data.tone,user.id);json(res,200,{user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(user.id))});return;
        }
        throw failure(404,'接口不存在。');
      }
      if(!['GET','HEAD'].includes(req.method))throw failure(405,'不支持此操作。');
      const pathname=decodeURIComponent(url.pathname);const relative=pathname==='/'?'index.html':pathname.slice(1);
      const pages=new Set(['index.html','activities.html','capsule.html','generations.html','account.html','styles.css','activities.css','account.css','app.js','activities.js','activity-data.js','account.js','account-core.js']);
      if(!pages.has(relative)&&!/^assets\/[\p{L}\p{N}_. /-]+$/u.test(relative))throw failure(404,'页面不存在。');
      const file=path.resolve(ROOT,relative);if(!file.startsWith(ROOT+path.sep)||relative.split('/').some(s=>s.startsWith('.')))throw failure(404,'页面不存在。');
      const stat=await fs.promises.stat(file).catch(()=>null);if(!stat?.isFile())throw failure(404,'页面不存在。');
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Content-Length':stat.size,'Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'服务暂时不可用，请稍后再试。'});else res.end();}
  });
  server.on('close',()=>db.close());return server;
}
module.exports={createMoyuServer};
if(require.main===module){const port=Number(process.env.PORT||4175),host=process.env.HOST||'127.0.0.1';createMoyuServer().listen(port,host,()=>console.log(`墨愚 http://${host}:${port} — 邮箱服务${process.env.SMTP_HOST&&process.env.SMTP_FROM?'已配置':'未配置，验证码注册暂不可用'}`));}