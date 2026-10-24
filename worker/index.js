const ASSETS = /*__SITE_ASSETS__*/null;
const SESSION_COOKIE = 'wk_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

const adminPage = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>WK.SLELCT 管理後台</title><style>
:root{font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#202020;background:#f6f6f4;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}.shell{min-height:100vh;display:grid;grid-template-columns:235px 1fr}.side{background:#fff;border-right:1px solid #e9e8e4;padding:22px 16px}.brand{padding:5px 10px 28px;font-weight:700;letter-spacing:.14em}.brand small{display:block;font-size:9px;color:#888;letter-spacing:.2em;margin-top:4px;font-weight:400}.nav{display:grid;gap:5px}.nav button{border:0;background:transparent;text-align:left;padding:12px 13px;color:#646464;cursor:pointer;border-radius:5px;font-size:13px}.nav button.active,.nav button:hover{background:#f7eded;color:#9c1717}.nav .soon{margin-left:5px;color:#aaa;font-size:10px}.main{min-width:0}.top{height:67px;background:white;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;padding:0 30px}.top span{font-size:12px;color:#666}.top button,.btn{border:1px solid #ddd;background:white;padding:9px 14px;border-radius:4px;cursor:pointer}.content{max-width:1200px;margin:0 auto;padding:30px}.heading{display:flex;align-items:end;justify-content:space-between;margin:0 0 22px}.heading h1{font-size:23px;font-weight:500;margin:0}.heading p{font-size:12px;color:#888;margin:7px 0 0}.primary{background:#961919!important;color:white!important;border-color:#961919!important}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}.stat,.panel{background:white;border:1px solid #ecebe8;border-radius:6px;padding:18px}.stat label{display:block;color:#858585;font-size:12px}.stat strong{display:block;font-size:28px;font-weight:500;margin-top:12px}.panel{padding:20px;margin-bottom:16px}.panel h2{font-size:15px;font-weight:600;margin:0 0 15px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:640px}th,td{text-align:left;border-bottom:1px solid #eee;padding:12px 10px;font-size:12px;vertical-align:middle}th{color:#777;font-weight:500;background:#fafafa}.thumb{width:42px;height:42px;object-fit:cover;background:#f5f5f5;border-radius:3px;vertical-align:middle;margin-right:8px}.pill{display:inline-block;background:#f4f0eb;color:#745a3b;border-radius:20px;padding:4px 9px;font-size:10px}.pill.live{background:#edf4ed;color:#467549}.row-actions{display:flex;gap:6px}.row-actions button{background:#fff;border:1px solid #ddd;border-radius:3px;padding:6px 8px;font-size:11px;cursor:pointer}.toolbar{display:flex;gap:9px;align-items:center;margin-bottom:14px}.toolbar input{flex:1;max-width:330px}.field{display:grid;gap:6px;font-size:12px;color:#666}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}input,select,textarea{padding:10px 11px;border:1px solid #ddd;border-radius:3px;background:white;min-width:0;color:#222}textarea{min-height:74px;resize:vertical}.wide{grid-column:1/-1}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}.message{min-height:18px;font-size:12px;color:#9c1717;margin-top:9px}.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login-box{background:#fff;border:1px solid #e7e5e1;border-radius:8px;width:min(420px,100%);padding:34px;box-shadow:0 12px 36px #00000008}.login-box h1{font-size:20px;margin:0 0 7px;font-weight:600}.login-box p{color:#888;font-size:12px;margin:0 0 23px}.login-box form{display:grid;gap:13px}.login-box .btn{padding:12px}.hidden{display:none!important}.empty{padding:24px;text-align:center;color:#888;font-size:13px}.tagline{color:#888;font-size:12px;line-height:1.8}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #e8e4dd;border-radius:20px;padding:7px 12px;background:#fff;font-size:11px;color:#555}
@media(max-width:800px){.shell{grid-template-columns:1fr}.side{border-right:0;border-bottom:1px solid #eee;padding:10px 12px}.brand{padding:6px 9px 12px}.nav{display:flex;overflow:auto;gap:3px}.nav button{white-space:nowrap;padding:9px}.top{height:54px;padding:0 16px}.content{padding:20px 14px}.cards{grid-template-columns:repeat(2,1fr)}.stat{padding:13px}.stat strong{font-size:23px}.heading h1{font-size:19px}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}}
</style></head><body><div id="app"><div class="login"><div class="login-box"><h1>WK.SLELCT 管理後台</h1><p>請使用管理員帳號登入</p><form id="loginForm" method="post" action="/admin" onsubmit="return false"><label class="field">管理員帳號<input name="username" required autocomplete="username"></label><label class="field">密碼<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">登入後台</button><div class="message" id="loginMessage"></div></form></div></div></div><script>
const app=document.querySelector('#app');let csrf='',products=[],page='home';const navItems=[['home','總覽'],['products','商品管理'],['brands','品牌與分類'],['stock','庫存與預購'],['orders','訂單管理'],['content','網站公告']];
async function api(url,opts={}){opts.headers={...(opts.headers||{}),'Content-Type':'application/json',...(csrf?{'X-Admin-CSRF':csrf}:{})};const r=await fetch(url,opts);let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'操作失敗');return d}
async function boot(){try{const s=await api('/api/admin/session');csrf=s.csrf;await loadProducts();draw()}catch{drawLogin()}}
function drawLogin(){app.innerHTML='<div class="login"><div class="login-box"><h1>WK.SLELCT 管理後台</h1><p>請使用管理員帳號登入</p><form id="loginForm" method="post" action="/admin" onsubmit="return false"><label class="field">管理員帳號<input name="username" required autocomplete="username"></label><label class="field">密碼<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">登入後台</button><div class="message" id="loginMessage"></div></form></div></div>';document.querySelector('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),m=document.querySelector('#loginMessage');m.textContent='登入中…';try{const s=await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:f.get('username'),password:f.get('password')})});csrf=s.csrf;await loadProducts();draw()}catch(err){m.textContent=err.message}}}
async function loadProducts(){products=(await api('/api/admin/products')).products}
function draw(){const title=navItems.find(x=>x[0]===page)?.[1]||'總覽';app.innerHTML='<div class="shell"><aside class="side"><div class="brand">WK.SLELCT<small>STORE ADMIN</small></div><nav class="nav">'+navItems.map(([id,label])=>'<button data-page="'+id+'" class="'+(page===id?'active':'')+'">'+label+(id==='orders'?'<span class="soon">未開放結帳</span>':'')+'</button>').join('')+'</nav></aside><section class="main"><header class="top"><span>管理後台　/　'+title+'</span><button id="logout">登出</button></header><main class="content" id="content"></main></section></div>';document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;draw()});document.querySelector('#logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});csrf='';drawLogin()};const c=document.querySelector('#content');if(page==='products')drawProducts(c);else if(page==='brands')drawBrands(c);else if(page==='stock')drawStock(c);else if(page==='orders')c.innerHTML='<div class="heading"><div><h1>訂單管理</h1><p>目前前台尚未串接線上結帳與訂單建立。</p></div></div><section class="panel"><div class="empty">當網站啟用結帳後，這裡可接上訂單狀態與出貨管理。現在顧客仍透過 LINE／IG 完成下單。</div></section>';else if(page==='content')c.innerHTML='<div class="heading"><div><h1>網站公告</h1><p>公告目前由前台輪播顯示，後台編輯功能將接續加入。</p></div></div><section class="panel"><div class="tagline">前台已設定滿額免運、LINE／IG 詢問與 Olive Young 活動公告。</div></section>';else drawHome(c)}
function drawHome(c){const live=products.filter(p=>p.status==='published').length,pre=products.filter(p=>p.type==='預購').length,low=products.filter(p=>p.type==='現貨'&&Number(p.stockQty)<=2&&p.status==='published').length;c.innerHTML='<div class="heading"><div><h1>商店總覽</h1><p>WK.SLELCT 商品與供貨狀況</p></div><button class="btn primary" id="quickAdd">＋ 新增商品</button></div><div class="cards"><div class="stat"><label>商品總數</label><strong>'+products.length+'</strong></div><div class="stat"><label>目前上架</label><strong>'+live+'</strong></div><div class="stat"><label>預購商品</label><strong>'+pre+'</strong></div><div class="stat"><label>低庫存現貨</label><strong>'+low+'</strong></div></div><section class="panel"><h2>最近更新商品</h2>'+table(products.slice(0,6))+'</section><section class="panel"><h2>營運提醒</h2><div class="tagline">網站目前採 LINE／IG 確認下單，尚未建立線上訂單、金流或會員資料。現貨與預購狀態由商品資料維護。</div></section>';document.querySelector('#quickAdd').onclick=()=>editProduct()}
function table(rows){if(!rows.length)return '<div class="empty">尚無商品</div>';return '<div class="table-wrap"><table><thead><tr><th>商品</th><th>品牌／分類</th><th>供貨方式</th><th>價格</th><th>狀態</th><th>管理</th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+(p.img?'<img class="thumb" src="'+esc(image(p.img))+'">':'')+esc(p.title)+'</td><td>'+esc(p.brand)+'<br><small>'+esc(p.category)+'</small></td><td>'+esc(p.type)+(p.type==='現貨'?' · '+Number(p.stockQty)+' 件':'')+'</td><td>'+(p.price?'NT$'+Number(p.price).toLocaleString():'未設定')+'</td><td><span class="pill '+(p.status==='published'?'live':'')+'">'+({published:'已上架',draft:'草稿',offline:'已下架',archived:'已封存'}[p.status]||p.status)+'</span></td><td><div class="row-actions"><button data-edit="'+p.id+'">編輯</button><button data-toggle="'+p.id+'">'+(p.status==='published'?'下架':'上架')+'</button></div></td></tr>').join('')+'</tbody></table></div>'}
function image(src){return src.toLowerCase().startsWith('https://')?src:(src.startsWith('/')?src:'/'+src)}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawProducts(c){c.innerHTML='<div class="heading"><div><h1>商品管理</h1><p>新增、編輯商品與上架狀態</p></div><button class="btn primary" id="newProduct">＋ 新增商品</button></div><section class="panel"><div class="toolbar"><input id="productSearch" placeholder="搜尋商品、品牌"><select id="statusFilter"><option value="">全部狀態</option><option value="published">已上架</option><option value="draft">草稿</option><option value="offline">已下架</option></select></div><div id="productTable"></div></section>';const paint=()=>{const q=document.querySelector('#productSearch').value.toLowerCase(),st=document.querySelector('#statusFilter').value;const list=products.filter(p=>(!st||p.status===st)&&(p.title+' '+p.brand).toLowerCase().includes(q));document.querySelector('#productTable').innerHTML=table(list);bindRows()};document.querySelector('#productSearch').oninput=paint;document.querySelector('#statusFilter').onchange=paint;document.querySelector('#newProduct').onclick=()=>editProduct();paint()}
function bindRows(){document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(products.find(p=>p.id===Number(b.dataset.edit))));document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const p=products.find(x=>x.id===Number(b.dataset.toggle));await saveProduct({...p,status:p.status==='published'?'offline':'published'});await loadProducts();draw()})}
function editProduct(p={}){const editing=Boolean(p.id);const overlay=document.createElement('div');overlay.style='position:fixed;inset:0;background:#0007;display:grid;place-items:center;padding:16px;z-index:5;overflow:auto';overlay.innerHTML='<section class="panel" style="width:min(700px,100%);max-height:96vh;overflow:auto"><div class="heading"><div><h1 style="font-size:19px">'+(editing?'編輯商品':'新增商品')+'</h1><p>填寫前台顯示與供貨資訊</p></div><button class="btn" id="formClose">關閉</button></div><form id="productForm"><input type="hidden" name="id" value="'+(p.id||'')+'"><div class="form-grid"><label class="field">商品名稱<input name="title" required value="'+esc(p.title||'')+'"></label><label class="field">品牌<input name="brand" required value="'+esc(p.brand||'')+'" placeholder="例如 MLB、MUCENT"></label><label class="field">商品分類<input name="category" value="'+esc(p.category||'服飾')+'" placeholder="上衣、配件"></label><label class="field">來源<select name="country"><option value="korea" '+((p.country||'korea')==='korea'?'selected':'')+'>🇰🇷 韓國選品</option><option value="japan" '+(p.country==='japan'?'selected':'')+'>🇯🇵 日本代購</option></select></label><label class="field">銷售方式<select name="type"><option '+((p.type||'預購')==='預購'?'selected':'')+'>預購</option><option '+(p.type==='現貨'?'selected':'')+'>現貨</option></select></label><label class="field">上架狀態<select name="status"><option value="draft" '+((p.status||'draft')==='draft'?'selected':'')+'>草稿</option><option value="published" '+(p.status==='published'?'selected':'')+'>已上架</option><option value="offline" '+(p.status==='offline'?'selected':'')+'>已下架</option></select></label><label class="field">售價（NT$）<input name="price" type="number" min="0" value="'+(p.price??'')+'" placeholder="選填"></label><label class="field">原價（NT$）<input name="originalPrice" type="number" min="0" value="'+(p.originalPrice??'')+'" placeholder="選填"></label><label class="field">現貨庫存<input name="stockQty" type="number" min="0" value="'+(p.stockQty||0)+'"></label><label class="field">商品標籤<select name="badge"><option value="">不顯示</option>'+['本週新品','限時連線','限時特價'].map(x=>'<option '+(p.badge===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label class="field wide">商品圖片網址或現有檔案<input name="img" value="'+esc(p.img||'assets/products/denim-overshirt.jpg')+'" placeholder="assets/products/xxx.jpg 或 https://..."></label><label class="field wide">尺寸／顏色／SKU<input name="variants" value="'+esc(p.variants||'')+'" placeholder="例如：黑色／S、M、L"></label><label class="field wide">商品說明<textarea name="description">'+esc(p.description||'')+'</textarea></label></div><div class="message" id="formMessage"></div><div class="form-actions"><button type="button" class="btn" id="cancelForm">取消</button><button class="btn primary">儲存商品</button></div></form></section>';document.body.appendChild(overlay);overlay.querySelectorAll('#formClose,#cancelForm').forEach(b=>b.onclick=()=>overlay.remove());overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};overlay.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),data=Object.fromEntries(f);data.id=data.id?Number(data.id):undefined;for(const k of ['price','originalPrice','stockQty'])data[k]=data[k]===''?null:Number(data[k]);try{await saveProduct(data);await loadProducts();overlay.remove();draw()}catch(err){overlay.querySelector('#formMessage').textContent=err.message}}}
async function saveProduct(p){return api('/api/admin/products',{method:'POST',body:JSON.stringify(p)})}
function drawBrands(c){const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))].sort(),cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort();c.innerHTML='<div class="heading"><div><h1>品牌與分類</h1><p>從商品資料整理目前使用中的品牌與分類</p></div><button class="btn primary" id="newBrand">＋ 用新品牌新增商品</button></div><section class="panel"><h2>品牌</h2><div class="chips">'+(brands.map(x=>'<span class="chip">'+esc(x)+'</span>').join('')||'<span class="tagline">尚無品牌</span>')+'</div></section><section class="panel"><h2>商品分類</h2><div class="chips">'+(cats.map(x=>'<span class="chip">'+esc(x)+'</span>').join('')||'<span class="tagline">尚無分類</span>')+'</div></section>';document.querySelector('#newBrand').onclick=()=>editProduct()}
function drawStock(c){const rows=products.filter(p=>p.type==='現貨');c.innerHTML='<div class="heading"><div><h1>庫存與預購</h1><p>現貨數量與預購商品分開追蹤</p></div></div><div class="cards"><div class="stat"><label>現貨商品</label><strong>'+rows.length+'</strong></div><div class="stat"><label>現貨總件數</label><strong>'+rows.reduce((n,p)=>n+Number(p.stockQty||0),0)+'</strong></div><div class="stat"><label>預購商品</label><strong>'+products.filter(p=>p.type==='預購').length+'</strong></div><div class="stat"><label>低庫存（≤2）</label><strong>'+rows.filter(p=>Number(p.stockQty)<=2).length+'</strong></div></div><section class="panel"><h2>現貨庫存</h2>'+table(rows)+'</section><section class="panel"><h2>預購商品</h2>'+table(products.filter(p=>p.type==='預購'))+'</section>';bindRows()}
document.addEventListener('DOMContentLoaded',()=>{const f=document.querySelector('#loginForm');if(f)f.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(f));try{const s=await api('/api/admin/login',{method:'POST',body:JSON.stringify(data)});csrf=s.csrf;await loadProducts();draw()}catch(err){document.querySelector('#loginMessage').textContent=err.message}}});boot();
</script></body></html>`;

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
function json(data, status = 200, headers = {}) {
  return response(JSON.stringify(data), status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}
function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromBase64Url(text) {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
function secureEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function cookieValue(request, name) {
  return (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1) || '';
}
function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
async function issueSession(username, secret) {
  const csrf = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const data = toBase64Url(new TextEncoder().encode(JSON.stringify({ username, csrf, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  return { data, csrf, sig: toBase64Url(await hmac(secret, data)) };
}
async function readSession(request, secret) {
  const value = cookieValue(request, SESSION_COOKIE), [data, sig] = value.split('.');
  if (!data || !sig) return null;
  const expected = toBase64Url(await hmac(secret, data));
  if (!secureEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(data)));
    return parsed.exp > Date.now() / 1000 ? parsed : null;
  } catch { return null; }
}
async function requireAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return { error: json({ error: '管理員尚未完成設定' }, 503) };
  const session = await readSession(request, env.ADMIN_SESSION_SECRET);
  if (!session) return { error: json({ error: '請先登入管理員帳號' }, 401) };
  if (!sameOrigin(request) || request.headers.get('X-Admin-CSRF') !== session.csrf) return { error: json({ error: '安全驗證失敗，請重新登入' }, 403) };
  return { session };
}
function mapProduct(row) {
  return { id: row.id, title: row.title, brand: row.brand, category: row.category, country: row.country, type: row.type, badge: row.badge, img: row.img, price: row.price, originalPrice: row.original_price, stockQty: row.stock_qty, status: row.status, variants: row.variants, description: row.description, date: row.date };
}
function validProduct(p) {
  return p && typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= 150 &&
    typeof p.brand === 'string' && p.brand.length <= 80 && ['korea','japan'].includes(p.country) &&
    ['現貨','預購'].includes(p.type) && ['','本週新品','限時連線','限時特價'].includes(p.badge) &&
    ['draft','published','offline'].includes(p.status) && Number.isInteger(p.stockQty ?? 0) && (p.stockQty ?? 0) >= 0 &&
    [p.price,p.originalPrice].every(v=>v==null||(Number.isInteger(v)&&v>=0)) &&
    typeof p.img === 'string' && p.img.length <= 1600 && (!p.img || p.img.startsWith('assets/products/') || p.img.startsWith('/assets/products/') || /^https:\/\//i.test(p.img));
}
async function handleApi(request, env, url) {
  if (url.pathname === '/api/products' && request.method === 'GET') {
    const { results = [] } = await env.DB.prepare("SELECT * FROM products WHERE status='published' ORDER BY date DESC,id DESC").all();
    return json({ products: results.map(mapProduct) }, 200, { 'Cache-Control': 'public, max-age=30' });
  }
  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '來源驗證失敗' }, 403);
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) return json({ error: '尚未設定管理員登入資訊' }, 503);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = toBase64Url(await hmac(env.ADMIN_SESSION_SECRET, ip));
    const now = Math.floor(Date.now() / 1000);
    const attempt = await env.DB.prepare('SELECT attempts,window_started,blocked_until FROM admin_login_attempts WHERE ip_hash=?').bind(ipHash).first();
    if (attempt?.blocked_until > now) return json({ error: '登入次數過多，請稍後再試。' }, 429);
    const payload = await request.json().catch(() => ({}));
    const valid = typeof payload.username === 'string' && typeof payload.password === 'string' &&
      secureEqual(payload.username, env.ADMIN_USERNAME) && secureEqual(payload.password, env.ADMIN_PASSWORD);
    if (!valid) {
      const count = attempt && now - attempt.window_started < 900 ? attempt.attempts + 1 : 1;
      const blocked = count >= 5 ? now + 900 : 0;
      await env.DB.prepare('INSERT INTO admin_login_attempts(ip_hash,attempts,window_started,blocked_until) VALUES(?,?,?,?) ON CONFLICT(ip_hash) DO UPDATE SET attempts=excluded.attempts,window_started=excluded.window_started,blocked_until=excluded.blocked_until').bind(ipHash,count,count===1?now:attempt.window_started,blocked).run();
      return json({ error: blocked ? '登入次數過多，請 15 分鐘後再試。' : '帳號或密碼不正確。' }, blocked ? 429 : 401);
    }
    await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_hash=?').bind(ipHash).run();
    const s = await issueSession(env.ADMIN_USERNAME, env.ADMIN_SESSION_SECRET);
    return json({ user: env.ADMIN_USERNAME, csrf: s.csrf }, 200, { 'Set-Cookie': SESSION_COOKIE+'='+s.data+'.'+s.sig+'; Path=/; Max-Age='+SESSION_SECONDS+'; HttpOnly; Secure; SameSite=Strict' });
  }
  if (url.pathname === '/api/admin/session' && request.method === 'GET') {
    const s = await readSession(request, env.ADMIN_SESSION_SECRET || '');
    return s ? json({ user: s.username, csrf: s.csrf }) : json({ error: '尚未登入' }, 401);
  }
  if (url.pathname.startsWith('/api/admin/')) {
    if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
      const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
      return json({ ok: true }, 200, { 'Set-Cookie': SESSION_COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict' });
    }
    const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
    if (url.pathname === '/api/admin/products' && request.method === 'GET') {
      const { results = [] } = await env.DB.prepare("SELECT * FROM products WHERE status!='archived' ORDER BY date DESC,id DESC").all();
      return json({ products: results.map(mapProduct) });
    }
    if (url.pathname === '/api/admin/products' && request.method === 'POST') {
      const p = await request.json().catch(() => null);
      if (!validProduct(p)) return json({ error: '請檢查商品名稱、品牌、價格、庫存或圖片網址。' }, 400);
      const fields = [p.title.trim(),p.brand.trim(),(p.category||'服飾').trim(),p.country,p.type,p.badge,p.img,p.price??null,p.originalPrice??null,p.stockQty??0,p.status,p.variants||'',p.description||'',Number(p.date)||Number(new Date().toISOString().slice(0,10).replaceAll('-',''))];
      let result;
      if (Number.isInteger(p.id) && p.id > 0) {
        result = await env.DB.prepare('UPDATE products SET title=?,brand=?,category=?,country=?,type=?,badge=?,img=?,price=?,original_price=?,stock_qty=?,status=?,variants=?,description=?,date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...fields,p.id).run();
      } else {
        result = await env.DB.prepare('INSERT INTO products(title,brand,category,country,type,badge,img,price,original_price,stock_qty,status,variants,description,date) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...fields).run();
      }
      return json({ ok: true, id: p.id || result.meta?.last_row_id });
    }
    const productId = Number(url.searchParams.get('id'));
    if (url.pathname === '/api/admin/products' && request.method === 'DELETE' && Number.isInteger(productId) && productId > 0) {
      await env.DB.prepare("UPDATE products SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(productId).run();
      return json({ ok: true });
    }
  }
  return json({ error: '找不到這個 API' }, 404);
}
async function handle(request, env) {
  const url = new URL(request.url);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
    if (url.pathname === '/admin' || url.pathname === '/admin/') return response(adminPage, 200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' });
    const asset = ASSETS?.[url.pathname];
    if (asset) return new Response(Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)), { headers: { 'Content-Type': asset.type, 'Cache-Control': asset.type.startsWith('image/') ? 'public, max-age=31536000, immutable' : 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    return response('Not Found', 404);
  } catch (error) {
    console.error('Request failed', error);
    return json({ error: '伺服器暫時無法處理，請稍後再試。' }, 500);
  }
}
export default { fetch: handle };
