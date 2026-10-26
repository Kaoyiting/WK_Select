const ASSETS = /*__SITE_ASSETS__*/null;
const SESSION_COOKIE = 'wk_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const SITE_CONTENT_DEFAULTS = {
  announcementRows:[{text:'全館滿 NT$1,800 免運',sortOrder:1,enabled:true},{text:'歡迎透過 LINE／IG 詢問商品',sortOrder:2,enabled:true},{text:'Olive Young Black Friday 11/1–11/7',sortOrder:3,enabled:true}],
  logoUrl:'assets/products/wk-logo.jpg',logoAlt:'WK 品牌標誌',brandName:'WK.SLELCT',brandTagline:'KOREA SELECT SHOP',heroSlides:[{image:'assets/products/adidas-ringer-tee.jpg',alt:'韓系日常穿搭',sortOrder:1,enabled:true}],bestSellersTitle:'熱銷商品',catalogSubtitle:'把質感日常放進你的衣櫥',emptyText:'目前此分類沒有上架商品，歡迎瀏覽其他選品。',
  footerBlock1:'韓系穿搭｜韓國服飾｜韓國代購',footerBlock2:'購物小提醒\n商品依頁面標示分為預購與現貨。\n預購商品到貨時間依品牌與物流狀況為準。\n也可提供 Musinsa 或任何韓國品牌的商品連結，透過 LINE／IG 詢問代找。',footerBlock3:'Musinsa 與韓國品牌代找\n在 Musinsa 或韓國品牌看到喜歡的商品？\n提供商品連結或截圖，可協助代找與代購。\nLINE 聯絡方式 https://linktr.ee/wk.select.kr\nInstagram @wk.select.kr https://www.instagram.com/wk.select.kr/',footerCopyright:'© 2026 WK.SLELCT. All rights reserved.',
  ckeditorLicenseKey:'',
  productContentHtml:'<h3>【預購商品】</h3><p>預購商品約 30 日工作天寄出（不含例假日）</p><p>下單前需確認款式及尺寸，恕無提供取消訂單及退換貨 🙌🏻</p><h3>【CUSTOMER SERVICE】</h3><p>官方 LINE 詢問 👉🏻 <a href="https://lin.ee/nXszmUz">https://lin.ee/nXszmUz</a></p><p>客服回覆時間：13:00～21:00</p><h3>【MUST READ】</h3><p>購買前請詳閱「寄送與退換貨規則」，下單即代表同意賣場規定。</p><h3>送貨方式</h3><ol><li>7-11 超商取貨付款（運費 NT$60）</li><li>7-11 超商取貨不付款（運費 NT$60）</li></ol><p>現貨、預購商品一起下單時，會待整筆訂單商品到齊後一起寄出。如想先收到現貨商品，請分開下單。</p><h3>付款方式</h3><ul><li>7-11 取貨付款</li><li>銀行轉帳（客服提供匯款資訊）</li></ul><p>目前尚未串接線上金流。</p>'
};
function mergeSiteContent(saved={}){const {productPageHtml,orderPageHtml,productContentHtml,...rest}=saved;const hasLegacy=productPageHtml!==undefined||orderPageHtml!==undefined,legacy=hasLegacy?[productPageHtml||'',orderPageHtml||''].map(x=>String(x).trim()).filter(Boolean).join(''):SITE_CONTENT_DEFAULTS.productContentHtml;return {...SITE_CONTENT_DEFAULTS,...rest,productContentHtml:productContentHtml??legacy}}
let siteContentTableReady;
async function ensureSiteContentTable(env){
  if(!siteContentTableReady)siteContentTableReady=env.DB.prepare('CREATE TABLE IF NOT EXISTS store_site_content (content_key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)').run().catch(error=>{siteContentTableReady=null;throw error});
  await siteContentTableReady;
}
function sanitizeRichText(input){
  const blocked=String(input||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|object|embed|svg|math|form|video|audio)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  const allowed=new Set(['p','br','div','h2','h3','h4','strong','b','em','i','u','s','ul','ol','li','blockquote','span','a','font']);
  const sizes=['12px','14px','16px','18px','20px','24px','28px','32px','small','medium','large','x-large','xx-large'];
  const cleanUrl=raw=>{const value=String(raw||'').trim();if(value.startsWith('/')&&!value.startsWith('//'))return value;try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?value:''}catch{return ''}};
  return blocked.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi,(whole,name,attrs)=>{
    const tag=name.toLowerCase(),closing=whole.startsWith('</');if(!allowed.has(tag))return '';
    if(tag==='font'){if(closing)return '</span>';const size=attrs.match(/\bsize\s*=\s*["']?(\d)/i)?.[1],map={1:'12px',2:'14px',3:'16px',4:'18px',5:'24px',6:'28px',7:'32px'};return '<span'+(map[size]?' style="font-size:'+map[size]+'"':'')+'>'}
    if(closing)return '</'+tag+'>';if(tag==='br')return '<br>';if(tag==='a'){const href=attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2],url=cleanUrl(href);return '<a'+(url?' href="'+url.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"':'')+'>'}
    if(tag==='span'){const declared=attrs.match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2]||'',size=declared.match(/font-size\s*:\s*([\w-]+|\d+px)/i)?.[1];return '<span'+(sizes.includes(size)?' style="font-size:'+size+'"':'')+'>'}
    return '<'+tag+'>';
  });
}

const adminPage = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>WK.SLELCT 管理後台</title><style>
:root{font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#202020;background:#f6f6f4;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}.shell{min-height:100vh;display:grid;grid-template-columns:235px 1fr}.side{background:#fff;border-right:1px solid #e9e8e4;padding:22px 16px}.brand{padding:5px 10px 28px;font-weight:700;letter-spacing:.14em}.brand small{display:block;font-size:9px;color:#888;letter-spacing:.2em;margin-top:4px;font-weight:400}.nav{display:grid;gap:5px}.nav button{border:0;background:transparent;text-align:left;padding:12px 13px;color:#646464;cursor:pointer;border-radius:5px;font-size:13px}.nav button.active,.nav button:hover{background:#f7eded;color:#9c1717}.nav .soon{margin-left:5px;color:#aaa;font-size:10px}.main{min-width:0}.top{height:67px;background:white;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;padding:0 30px}.top span{font-size:12px;color:#666}.top button,.btn{border:1px solid #ddd;background:white;padding:9px 14px;border-radius:4px;cursor:pointer}.content{max-width:1200px;margin:0 auto;padding:30px}.heading{display:flex;align-items:end;justify-content:space-between;margin:0 0 22px}.heading h1{font-size:23px;font-weight:500;margin:0}.heading p{font-size:12px;color:#888;margin:7px 0 0}.primary{background:#961919!important;color:white!important;border-color:#961919!important}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}.stat,.panel{background:white;border:1px solid #ecebe8;border-radius:6px;padding:18px}.stat label{display:block;color:#858585;font-size:12px}.stat strong{display:block;font-size:28px;font-weight:500;margin-top:12px}.panel{padding:20px;margin-bottom:16px}.panel h2{font-size:15px;font-weight:600;margin:0 0 15px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:640px}th,td{text-align:left;border-bottom:1px solid #eee;padding:12px 10px;font-size:12px;vertical-align:middle}th{color:#777;font-weight:500;background:#fafafa}.thumb{width:42px;height:42px;object-fit:cover;background:#f5f5f5;border-radius:3px;vertical-align:middle;margin-right:8px}.pill{display:inline-block;background:#f4f0eb;color:#745a3b;border-radius:20px;padding:4px 9px;font-size:10px}.pill.live{background:#edf4ed;color:#467549}.row-actions{display:flex;gap:6px}.row-actions button{white-space:nowrap;flex:none;background:#fff;border:1px solid #ddd;border-radius:3px;padding:6px 8px;font-size:11px;cursor:pointer}.toolbar{display:flex;gap:9px;align-items:center;margin-bottom:14px}.toolbar input{flex:1;max-width:330px}.field{display:grid;gap:6px;font-size:12px;color:#666}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}input,select,textarea{padding:10px 11px;border:1px solid #ddd;border-radius:3px;background:white;min-width:0;color:#222}textarea{min-height:74px;resize:vertical}.wide{grid-column:1/-1}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}.message{min-height:18px;font-size:12px;color:#9c1717;margin-top:9px}.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login-box{background:#fff;border:1px solid #e7e5e1;border-radius:8px;width:min(420px,100%);padding:34px;box-shadow:0 12px 36px #00000008}.login-box h1{font-size:20px;margin:0 0 7px;font-weight:600}.login-box p{color:#888;font-size:12px;margin:0 0 23px}.login-box form{display:grid;gap:13px}.login-box .btn{padding:12px}.hidden{display:none!important}.empty{padding:24px;text-align:center;color:#888;font-size:13px}.tagline{color:#888;font-size:12px;line-height:1.8}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #e8e4dd;border-radius:20px;padding:7px 12px;background:#fff;font-size:11px;color:#555}
@media(max-width:800px){.shell{grid-template-columns:minmax(0,1fr)}.side{min-width:0;border-right:0;border-bottom:1px solid #eee;padding:10px 12px}.brand{padding:6px 9px 12px}.nav{display:flex;min-width:0;max-width:100%;overflow:auto;gap:3px}.nav button{flex:none;white-space:nowrap;padding:10px;min-height:42px}.main{min-width:0}.top{height:54px;padding:0 16px}.content{padding:20px 14px}.cards{grid-template-columns:repeat(2,1fr)}.stat{padding:13px}.stat strong{font-size:23px}.heading h1{font-size:19px}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}.panel{padding:16px}.content-savebar{position:sticky;bottom:0;background:#f6f6f4;padding:10px 0;z-index:2}.content-savebar button{width:100%;min-height:46px}.content-image-row{grid-template-columns:1fr}.content-preview{width:100%;height:160px}.content-section-head{align-items:flex-start;flex-direction:column}.content-section-head .btn{width:100%;min-height:44px}.content-list-summary{align-items:flex-start;flex-direction:column}.content-list-actions{width:100%;flex-wrap:wrap}.content-list-actions button{flex:1}.content-list-actions .icon-action{flex:0 0 40px}.content-row-editor .form-grid{grid-template-columns:1fr}.content-row-editor .field:first-child{grid-column:auto}.rich-toolbar button{flex:1}}
@media(max-width:420px){.content{padding:16px 10px}.nav button{padding:9px;font-size:12px}.heading{align-items:flex-start;gap:10px;flex-direction:column}.heading .btn{width:100%;min-height:44px}.form-actions button{min-height:44px}}
:root{scroll-behavior:smooth}.content-image-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,180px);gap:12px;align-items:start}.content-preview{width:100%;height:116px;object-fit:contain;background:#f5f4f1;border:1px solid #eee;border-radius:4px}.content-help{font-size:11px;color:#888;line-height:1.6}.content-savebar{display:flex;justify-content:flex-end}.content-upload{font-size:12px}.content-form textarea{min-height:86px}.content-section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px}.content-section-head h2{margin:0}.content-list{display:grid;gap:8px;margin:14px 0}.content-list-row{border:1px solid #e9e6e1;border-radius:5px;padding:12px 14px;background:#fff}.content-list-summary{display:flex;align-items:center;justify-content:space-between;gap:14px}.content-list-title{min-width:0;overflow-wrap:anywhere;font-size:13px;color:#333}.content-list-meta{font-size:11px;color:#888;margin-top:4px}.content-list-actions{display:flex;align-items:center;gap:7px;flex:none}.content-list-actions button{min-height:38px}.icon-action{width:40px;height:40px;padding:7px;border:1px solid currentColor;border-radius:6px;background:#fff;display:grid;place-items:center;cursor:pointer;transition:background .15s,color .15s,opacity .15s}.icon-action svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.edit-icon{color:#829344}.edit-icon:hover{background:#f1f5e7}.visibility-icon.is-visible{color:#13a6e3}.visibility-icon.is-hidden{color:#777;opacity:.58;background:#f5f5f5}.visibility-label.is-visible{color:#1187bd}.visibility-label.is-hidden{color:#888}.rich-editor{min-height:420px}.image-paste-zone{min-height:86px;border:1px dashed #9c9b93;border-radius:6px;background:#fbfbf9;display:grid;place-items:center;padding:18px;text-align:center;color:#696961;cursor:text;outline:none}.image-paste-zone:focus{border-color:#829344;box-shadow:0 0 0 3px #82934422}.image-upload-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.image-upload-tools input[type=file]{max-width:300px;padding:6px}.image-upload-tip{font-size:11px;color:#888;line-height:1.6}.content-row-editor{display:none;border-top:1px solid #eee;margin-top:12px;padding-top:12px}.content-list-row.is-editing .content-row-editor{display:block}.content-row-editor .form-grid{grid-template-columns:1fr 1fr}.content-row-editor .field:first-child{grid-column:1/-1}.rich-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:9px 0}.rich-toolbar button{min-width:40px;min-height:40px}.rich-toolbar select{height:40px}.rich-editor{min-height:420px;border:1px solid #ddd;border-radius:4px;padding:14px;background:white;line-height:1.8;outline-color:#9b2222;overflow-wrap:anywhere}.rich-editor:empty:before{content:attr(data-placeholder);color:#aaa}.rich-editor h3{font-size:18px;margin:15px 0 7px}.rich-editor p{margin:6px 0}.rich-editor ol,.rich-editor ul{padding-left:26px}.rich-help{font-size:11px;color:#888}
.image-preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}.image-preview-grid figure{margin:0;padding:8px;border:1px solid #ddd;border-radius:5px}.image-preview-grid img{display:block;width:100%;height:130px;object-fit:contain;background:#fafafa}.image-preview-grid figcaption{font-size:11px;margin-top:7px;color:#777}.editor-preview{padding:18px;border:1px solid #ddd;min-height:300px;line-height:1.8}.ck-editor__editable_inline{min-height:420px}.ck-editor{min-width:0;max-width:100%}</style></head><body><div id="app"><div class="login"><div class="login-box"><h1>WK.SLELCT 管理後台</h1><p>請使用管理員帳號登入</p><form id="loginForm" method="post" action="/admin" onsubmit="return false"><label class="field">管理員帳號<input name="username" required autocomplete="username"></label><label class="field">密碼<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">登入後台</button><div class="message" id="loginMessage"></div></form></div></div></div><script>
if(location.search)history.replaceState(null,'',location.pathname+location.hash);
const app=document.querySelector('#app');let siteEditor=null,ckeditorLoad=null;let csrf='',products=[],brands=[],categories=[],menus=[],page='home';const navItems=[['home','總覽'],['products','商品管理'],['menus','導覽選單'],['brands','品牌與分類'],['stock','庫存與預購'],['orders','訂單管理'],['content','網站內容']];
async function api(url,opts={}){const headers={...(opts.headers||{}),...(csrf?{'X-Admin-CSRF':csrf}:{})};if(!(opts.body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(url,{...opts,headers});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'操作失敗');return d}
async function loadCatalog(){const d=await api('/api/admin/catalog');brands=d.brands;categories=d.categories}
async function boot(){try{const s=await api('/api/admin/session');csrf=s.csrf;await Promise.all([loadProducts(),loadCatalog(),loadMenus()]);draw()}catch{drawLogin()}}
async function loadMenus(){menus=(await api('/api/admin/menus')).menus.map(x=>({...x,parentId:x.parent_id,actionValue:x.action_value,sortOrder:x.sort_order}))}
function drawLogin(){app.innerHTML='<div class="login"><div class="login-box"><h1>WK.SLELCT 管理後台</h1><p>請使用管理員帳號登入</p><form id="loginForm" method="post" action="/admin" onsubmit="return false"><label class="field">管理員帳號<input name="username" required autocomplete="username"></label><label class="field">密碼<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">登入後台</button><div class="message" id="loginMessage"></div></form></div></div>';document.querySelector('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),m=document.querySelector('#loginMessage');m.textContent='登入中…';try{const s=await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:f.get('username'),password:f.get('password')})});csrf=s.csrf;await Promise.all([loadProducts(),loadCatalog(),loadMenus()]);draw()}catch(err){m.textContent=err.message}}}
async function loadProducts(){products=(await api('/api/admin/products')).products}
function draw(){if(siteEditor){siteEditor.destroy().catch(()=>{});siteEditor=null}const title=navItems.find(x=>x[0]===page)?.[1]||'總覽';app.innerHTML='<div class="shell"><aside class="side"><div class="brand">WK.SLELCT<small>STORE ADMIN</small></div><nav class="nav">'+navItems.map(([id,label])=>'<button data-page="'+id+'" class="'+(page===id?'active':'')+'">'+label+'</button>').join('')+'</nav></aside><section class="main"><header class="top"><span>管理後台　/　'+title+'</span><button id="logout">登出</button></header><main class="content" id="content"></main></section></div>';document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;draw()});document.querySelector('#logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});csrf='';drawLogin()};const c=document.querySelector('#content');if(page==='products')drawProducts(c);else if(page==='menus')drawMenus(c);else if(page==='brands')drawBrands(c);else if(page==='stock')drawStock(c);else if(page==='orders')drawOrders(c);else if(page==='content')drawContent(c);else drawHome(c)}
function drawHome(c){const live=products.filter(p=>p.status==='published').length,pre=products.filter(p=>p.type==='預購').length,low=products.filter(p=>p.type==='現貨'&&Number(p.stockQty)<=2&&p.status==='published').length;c.innerHTML='<div class="heading"><div><h1>商店總覽</h1><p>WK.SLELCT 商品與供貨狀況</p></div><button class="btn primary" id="quickAdd">＋ 新增商品</button></div><div class="cards"><div class="stat"><label>商品總數</label><strong>'+products.length+'</strong></div><div class="stat"><label>目前上架</label><strong>'+live+'</strong></div><div class="stat"><label>預購商品</label><strong>'+pre+'</strong></div><div class="stat"><label>待處理訂單</label><strong id="pendingOrderCount">載入中</strong></div></div><section class="panel"><h2>最近更新商品</h2>'+table(products.slice(0,6))+'</section><section class="panel"><h2>營運提醒</h2><div class="tagline">訂單由前台結帳表單建立；付款需由客服確認，目前尚未串接線上金流。</div></section>';document.querySelector('#quickAdd').onclick=()=>editProduct();bindRows();api('/api/admin/orders').then(d=>{const n=document.querySelector('#pendingOrderCount');if(n)n.textContent=d.orders.filter(o=>o.status==='pending').length}).catch(()=>{const n=document.querySelector('#pendingOrderCount');if(n)n.textContent='—'})}
async function drawContent(c){
  c.innerHTML='<div class="heading"><div><h1>網站內容</h1><p>公告可新增與排序；首頁輪播會自動播放；頁尾每欄都是一個完整文字區塊。</p></div></div><section class="panel empty">載入網站內容中…</section>';
  try{
    const data=await api('/api/admin/site-content'),content=data.content||{};
    const field=(key,label,type='text',wide=false)=>{const value=content[key]??'';if(type==='image')return '<div class="field wide"><span>'+esc(label)+'</span><div class="content-image-row"><div><input data-content-field name="'+key+'" value="'+esc(value)+'" placeholder="圖片網址或上傳圖片" inputmode="url"><input class="content-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload-content="'+key+'"><div class="content-help">支援 JPG、PNG、WEBP、GIF，單張最大 5MB。</div></div><img class="content-preview" data-preview-content="'+key+'" src="'+(value?esc(image(value)):'')+'" alt="'+esc(label)+' 預覽" '+(value?'':'hidden')+'></div></div>';if(type==='textarea')return '<label class="field wide">'+esc(label)+'<textarea data-content-field name="'+key+'" maxlength="2000">'+esc(value)+'</textarea></label>';return '<label class="field '+(wide?'wide':'')+'">'+esc(label)+'<input data-content-field name="'+key+'" '+(type==='url'?'type="url" inputmode="url"':'')+' maxlength="'+(type==='url'?1000:2000)+'" value="'+esc(value)+'"></label>'};
    const announcements=Array.isArray(content.announcementRows)?content.announcementRows:[],slides=Array.isArray(content.heroSlides)?content.heroSlides:[];
    const richField=(key,label)=>'<div class="field wide"><span>'+label+'</span><div id="ckeditorStatus" class="content-help" role="status"></div><textarea hidden name="'+key+'" id="productContentSource">'+esc(content[key]||'')+'</textarea><div id="ckeditorHost" class="ck-content editor-preview">'+(content[key]||'')+'</div></div>';
    const sections='<section class="panel"><div class="content-section-head"><div><h2>公告</h2><p class="content-help">依顯示順序排列；隱藏的公告會移到列表最後。</p></div><button type="button" class="btn primary" id="addAnnouncement">＋ 新增公告</button></div><div id="announcementRowsEditor" class="content-list"></div></section>'+
      '<section class="panel"><h2>品牌識別</h2><div class="form-grid">'+field('logoUrl','品牌 Logo','image')+field('logoAlt','Logo 替代文字')+field('brandName','品牌名稱')+field('brandTagline','品牌副標')+'</div></section>'+
      '<section class="panel"><div class="content-section-head"><div><h2>首頁投影片</h2><p class="content-help">依顯示順序播放；隱藏的圖片會移到列表最後。</p></div><button type="button" class="btn primary" id="addHeroSlide">＋ 新增投影片</button></div><div id="heroSlidesEditor" class="content-list"></div></section>'+
      '<section class="panel"><h2>首頁與商品列表</h2><div class="form-grid">'+field('bestSellersTitle','首頁商品區塊標題')+field('catalogSubtitle','商品列表副標')+field('emptyText','分類空頁提示','textarea')+'</div></section>'+
      '<section class="panel"><h2>頁尾文字區塊</h2><p class="content-help">每個區塊只需編輯一整段文字；換行會保留。文字中的網址會自動變成連結。</p><div class="form-grid">'+field('footerBlock1','頁尾區塊 1','textarea')+field('footerBlock2','頁尾區塊 2','textarea')+field('footerBlock3','頁尾區塊 3','textarea')+field('footerCopyright','頁尾版權文字','text',true)+'</div></section>'+
      '<section class="panel"><h2>商品頁文字編輯器 · CKEditor</h2><p class="content-help">填入 CKEditor 商用 CDN 授權金鑰後啟用；現有內容會保留。</p><div class="form-grid">'+field('ckeditorLicenseKey','CKEditor 授權金鑰（License key）','text',true)+'<div class="wide"><button type="button" class="btn" id="activateCkeditor">套用金鑰並啟用編輯器</button> <a href="https://portal.ckeditor.com/checkout?plan=free" target="_blank" rel="noopener">取得官方金鑰</a></div>'+richField('productContentHtml','商品頁內容')+'</div></section>';
    c.innerHTML='<div class="heading"><div><h1>網站內容</h1><p>修改前台公告、首頁投影片與頁尾區塊。</p></div></div><form id="siteContentForm" class="content-form">'+sections+'<div class="content-savebar"><button class="btn primary" type="submit">儲存網站內容</button></div><div id="siteContentMessage" class="message" role="status" aria-live="polite"></div></form>';
    const form=document.querySelector('#siteContentForm'),message=document.querySelector('#siteContentMessage'),announcementEditor=form.querySelector('#announcementRowsEditor'),slideEditor=form.querySelector('#heroSlidesEditor');
    const ordered=(rows)=>rows.slice().sort((a,b)=>(a.enabled===false)-(b.enabled===false)||(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0));
    function collectRows(container,kind){return [...container.children].map(el=>{const row={};el.querySelectorAll('[data-row-field]').forEach(input=>row[input.dataset.rowField]=input.value.trim());row.enabled=el.querySelector('[data-row-enabled]').checked;row.sortOrder=Math.max(1,Number(row.sortOrder)||1);return kind==='announcement'?{text:row.text||'',sortOrder:row.sortOrder,enabled:row.enabled}:{image:row.image||'',alt:row.alt||'',sortOrder:row.sortOrder,enabled:row.enabled}})}
    function renderRows(container,rows,kind,editIndex=-1){const announcement=kind==='announcement',name=announcement?'公告':'投影片';container.innerHTML='';ordered(rows).forEach((row,index)=>{const el=document.createElement('div');el.className='content-list-row'+(index===editIndex?' is-editing':'');el.dataset.repeatKind=kind;
      const title=announcement?(row.text||'（未填字幕）'):(row.alt||row.image||'（尚未選擇圖片）');const preview=announcement?'':'<img class="thumb" src="'+(row.image?esc(image(row.image)):'')+'" alt="" style="margin:0 10px 0 0">';
      el.innerHTML='<div class="content-list-summary"><div style="display:flex;align-items:center;min-width:0">'+preview+'<div class="content-list-title">'+esc(title)+'<div class="content-list-meta">顯示順序：'+(Number(row.sortOrder)||index+1)+' · <span class="visibility-label '+(row.enabled===false?'is-hidden':'is-visible')+'">'+(row.enabled===false?'隱藏':'顯示')+'</span></div></div></div><div class="content-list-actions"><button type="button" class="icon-action edit-icon" data-edit-row aria-label="編輯'+name+'" title="編輯"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg></button><button type="button" class="icon-action visibility-icon '+(row.enabled===false?'is-hidden':'is-visible')+'" data-toggle-row aria-label="'+(row.enabled===false?'顯示':'隱藏')+name+'" title="'+(row.enabled===false?'點擊顯示':'點擊隱藏')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.2 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'+(row.enabled===false?'<path d="m4 4 16 16"/>':'')+'</svg></button></div></div><div class="content-row-editor"><div class="form-grid">'+(announcement?field('text','字幕文字'):field('image','投影片圖片','image')+(field('alt','圖片替代文字')))+field('sortOrder','顯示順序')+'<label class="field row-enabled"><span>前台顯示</span><input type="checkbox" data-row-enabled '+(row.enabled!==false?'checked':'')+'></label></div><div class="form-actions"><button type="button" class="btn" data-delete-row>刪除'+name+'</button><button type="button" class="btn" data-close-editor>完成</button></div></div>';
      for(const input of el.querySelectorAll('[data-content-field]')){const key=input.name;input.removeAttribute('data-content-field');input.dataset.rowField=key;input.value=row[key]??(key==='sortOrder'?index+1:'');if(key==='image'){const img=el.querySelector('[data-preview-content="image"]');if(img&&input.value){img.src=image(input.value);img.hidden=false}}}
      el.querySelector('[data-edit-row]').onclick=()=>{const data=collectRows(container,kind),next=el.classList.contains('is-editing')?-1:index;renderRows(container,data,kind,next)};
      el.querySelector('[data-close-editor]').onclick=()=>renderRows(container,collectRows(container,kind),kind);
      el.querySelector('[data-toggle-row]').onclick=()=>{const data=collectRows(container,kind);data[index].enabled=!data[index].enabled;renderRows(container,data,kind)};
      el.querySelector('[data-delete-row]').onclick=()=>{const data=collectRows(container,kind);data.splice(index,1);renderRows(container,data,kind)};
      const order=el.querySelector('[data-row-field="sortOrder"]');order.onchange=()=>{const data=collectRows(container,kind),draft=data[index];renderRows(container,data,kind,ordered(data).indexOf(draft))};
      const upload=el.querySelector('[data-upload-content]');if(upload)upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;message.textContent='圖片上傳中…';const body=new FormData();body.append('file',file);body.append('folder','site');try{const result=await api('/api/admin/upload',{method:'POST',body}),target=el.querySelector('[data-row-field="image"]'),img=el.querySelector('[data-preview-content="image"]');target.value=result.url;img.src=image(result.url);img.hidden=false;message.textContent='圖片已上傳，記得儲存網站內容。'}catch(error){message.textContent=error.message}finally{upload.value=''}};
      container.append(el)
    })}
    renderRows(announcementEditor,announcements,'announcement');renderRows(slideEditor,slides,'slide');
    form.querySelector('#addAnnouncement').onclick=()=>{const rows=collectRows(announcementEditor,'announcement'),max=Math.max(0,...rows.map(x=>Number(x.sortOrder)||0)),draft={text:'',sortOrder:max+1,enabled:true};rows.push(draft);renderRows(announcementEditor,rows,'announcement',ordered(rows).indexOf(draft))};
    form.querySelector('#addHeroSlide').onclick=()=>{const rows=collectRows(slideEditor,'slide'),max=Math.max(0,...rows.map(x=>Number(x.sortOrder)||0)),draft={image:'',alt:'',sortOrder:max+1,enabled:true};rows.push(draft);renderRows(slideEditor,rows,'slide',ordered(rows).indexOf(draft))};
    async function activateCkeditor(){const status=form.querySelector('#ckeditorStatus'),host=form.querySelector('#ckeditorHost'),source=form.querySelector('#productContentSource'),key=form.elements.ckeditorLicenseKey.value.trim();if(!key){status.textContent='尚未填入授權金鑰，目前顯示內容預覽。';return}if(siteEditor){source.value=siteEditor.getData();await siteEditor.destroy();siteEditor=null}status.textContent='正在載入 CKEditor…';try{if(!window.CKEDITOR){if(!ckeditorLoad)ckeditorLoad=new Promise((resolve,reject)=>{const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdn.ckeditor.com/ckeditor5/49.0.0/ckeditor5.css';document.head.append(css);const script=document.createElement('script');script.src='https://cdn.ckeditor.com/ckeditor5/49.0.0/ckeditor5.umd.js';script.onload=resolve;script.onerror=()=>{ckeditorLoad=null;reject(new Error('無法載入 CKEditor，請檢查網路後重試。'))};document.head.append(script)});await ckeditorLoad}if(!host.isConnected)return;const C=window.CKEDITOR,instance=await C.ClassicEditor.create({attachTo:host,licenseKey:key,root:{initialData:source.value},plugins:[C.Essentials,C.Paragraph,C.Heading,C.Link,C.BlockQuote,C.GeneralHtmlSupport],toolbar:['undo','redo','|','heading','link','blockQuote'],htmlSupport:{allow:[{name:/^(p|div|h2|h3|h4|strong|b|em|i|u|s|ul|ol|li|blockquote|span|a)$/,attributes:['href'],styles:['font-size']}]}});if(!form.isConnected){await instance.destroy();return}siteEditor=instance;status.textContent='CKEditor 已啟用；儲存網站內容後會套用至商品頁。'}catch(error){status.textContent='CKEditor 啟用失敗，請確認金鑰與授權網域設定後重試。現有內容已保留。';host.innerHTML=source.value}}form.querySelector('#activateCkeditor').onclick=activateCkeditor;activateCkeditor();
    form.querySelectorAll('[data-upload-content]').forEach(input=>input.onchange=async()=>{const file=input.files?.[0];if(!file)return;message.textContent='圖片上傳中…';const body=new FormData();body.append('file',file);body.append('folder','site');try{const result=await api('/api/admin/upload',{method:'POST',body}),target=form.elements[input.dataset.uploadContent],preview=form.querySelector('[data-preview-content="'+input.dataset.uploadContent+'"]');target.value=result.url;preview.src=image(result.url);preview.hidden=false;message.textContent='圖片已上傳，記得儲存網站內容。'}catch(error){message.textContent=error.message}finally{input.value=''}});
    form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type="submit"]'),values=Object.fromEntries(new FormData(form));values.announcementRows=collectRows(announcementEditor,'announcement');values.heroSlides=collectRows(slideEditor,'slide');values.productContentHtml=siteEditor?siteEditor.getData():form.querySelector('#productContentSource').value;button.disabled=true;message.textContent='儲存中…';try{await api('/api/admin/site-content',{method:'POST',body:JSON.stringify({content:values})});message.textContent='已儲存。重新整理前台即可看到更新。'}catch(error){message.textContent=error.message}finally{button.disabled=false}}
  }catch(error){c.innerHTML='<div class="heading"><div><h1>網站內容</h1><p>讀取失敗</p></div></div><section class="panel"><div class="message">'+esc(error.message)+'</div></section>'}
}
const orderStatuses={pending:'待確認',confirmed:'已確認',shipped:'已出貨',completed:'已完成',cancelled:'已取消'};
async function drawOrders(c){c.innerHTML='<div class="heading"><div><h1>訂單管理</h1><p>顧客從前台結帳送出的訂單</p></div></div><section class="panel"><div id="orderTable" class="empty">載入訂單中…</div></section>';try{const {orders=[]}=await api('/api/admin/orders');if(!document.querySelector('#orderTable'))return;if(!orders.length){document.querySelector('#orderTable').innerHTML='<div class="empty">目前還沒有訂單</div>';return}document.querySelector('#orderTable').innerHTML='<div class="table-wrap"><table style="min-width:900px"><thead><tr><th>訂單</th><th>顧客／聯絡</th><th>商品</th><th>配送／付款</th><th>金額</th><th>狀態</th></tr></thead><tbody>'+orders.map(o=>'<tr><td><strong>'+esc(o.order_number)+'</strong><br><small>'+esc(o.created_at)+'</small></td><td>'+esc(o.customer_name)+'<br>'+esc(o.phone)+(o.email?'<br>'+esc(o.email):'')+'</td><td>'+o.items.map(i=>esc(i.title)+' × '+Number(i.quantity)+(i.color||i.size?'（'+esc([i.color,i.size].filter(Boolean).join('／'))+'）':'')).join('<br>')+'</td><td>'+({'711_cod':'7-11 取貨付款','711_prepaid':'7-11 取貨不付款'}[o.shipping_method]||esc(o.shipping_method))+'<br>'+esc(o.store_name)+'<br>'+({'711_cod':'取貨付款',bank_transfer:'銀行轉帳'}[o.payment_method]||esc(o.payment_method))+'</td><td>商品 NT$'+Number(o.subtotal).toLocaleString()+'<br>運費 NT$'+Number(o.shipping_fee).toLocaleString()+'<br><strong>合計 NT$'+Number(o.total).toLocaleString()+'</strong></td><td><select data-order-status="'+o.id+'">'+Object.entries(orderStatuses).map(([v,label])=>'<option value="'+v+'" '+(o.status===v?'selected':'')+'>'+label+'</option>').join('')+'</select></td></tr>').join('')+'</tbody></table></div>';document.querySelectorAll('[data-order-status]').forEach(select=>select.onchange=async()=>{select.disabled=true;try{await api('/api/admin/orders',{method:'POST',body:JSON.stringify({id:Number(select.dataset.orderStatus),status:select.value})});select.title='訂單狀態已更新'}catch(e){alert(e.message);await drawOrders(c)}finally{select.disabled=false}})}catch(e){document.querySelector('#orderTable').textContent=e.message}}
function priceLabel(p){if(p.salePrice!=null)return '<del style="color:#999">NT$'+Number(p.price).toLocaleString()+'</del> <strong style="color:#a40000">NT$'+Number(p.salePrice).toLocaleString()+'</strong>';return p.price!=null?'NT$'+Number(p.price).toLocaleString():'未設定'}
function table(rows){if(!rows.length)return '<div class="empty">尚無商品</div>';return '<div class="table-wrap"><table><thead><tr><th>商品</th><th>品牌／分類</th><th>供貨方式</th><th>原價／特價</th><th>狀態</th><th>管理</th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+(p.img?'<img class="thumb" src="'+esc(image(p.img))+'">':'')+esc(p.title)+'</td><td>'+esc(p.brand)+'<br><small>'+esc(p.category)+'</small></td><td>'+esc(p.type)+(p.type==='現貨'?' · '+Number(p.stockQty)+' 件':'')+'</td><td>'+priceLabel(p)+'</td><td><span class="pill '+(p.status==='published'?'live':'')+'">'+({published:'已上架',draft:'草稿',offline:'已下架',archived:'已封存'}[p.status]||p.status)+'</span></td><td><div class="row-actions"><button data-edit="'+p.id+'">編輯</button><button data-toggle="'+p.id+'">'+(p.status==='published'?'下架':'上架')+'</button></div></td></tr>').join('')+'</tbody></table></div>'}
function image(src){return src.toLowerCase().startsWith('https://')?src:(src.startsWith('/')?src:'/'+src)}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawProducts(c){c.innerHTML='<div class="heading"><div><h1>商品管理</h1><p>新增、編輯商品與上架狀態</p></div><button class="btn primary" id="newProduct">＋ 新增商品</button></div><section class="panel"><div class="toolbar"><input id="productSearch" placeholder="搜尋商品、品牌"><select id="statusFilter"><option value="">全部狀態</option><option value="published">已上架</option><option value="draft">草稿</option><option value="offline">已下架</option></select></div><div id="productTable"></div></section>';const paint=()=>{const q=document.querySelector('#productSearch').value.toLowerCase(),st=document.querySelector('#statusFilter').value;const list=products.filter(p=>(!st||p.status===st)&&(p.title+' '+p.brand).toLowerCase().includes(q));document.querySelector('#productTable').innerHTML=table(list);bindRows()};document.querySelector('#productSearch').oninput=paint;document.querySelector('#statusFilter').onchange=paint;document.querySelector('#newProduct').onclick=()=>editProduct();paint()}
function showProductActionMessage(text,isError=false){const content=document.querySelector('#content');if(!content)return;let message=content.querySelector('#productActionMessage');if(!message){message=document.createElement('div');message.id='productActionMessage';message.className='message';message.setAttribute('role','status');message.setAttribute('aria-live','polite');content.prepend(message)}message.textContent=text;message.style.color=isError?'#9c1717':'#467549'}
function bindRows(){document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const p=products.find(p=>Number(p.id)===Number(b.dataset.edit));if(!p){showProductActionMessage('找不到商品，請重新整理後再試。',true);return}try{editProduct(p)}catch(error){showProductActionMessage('無法開啟商品編輯：'+error.message,true)}});document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const p=products.find(x=>Number(x.id)===Number(b.dataset.toggle));if(!p||b.disabled)return;const nextStatus=p.status==='published'?'offline':'published',label=b.textContent;b.disabled=true;b.textContent='處理中…';try{await saveProduct({...p,status:nextStatus});await loadProducts();draw();showProductActionMessage('「'+p.title+'」已'+(nextStatus==='offline'?'下架':'上架')+'。')}catch(error){showProductActionMessage('商品狀態更新失敗：'+error.message,true)}finally{if(b.isConnected){b.disabled=false;b.textContent=label}}})}

function editProduct(p={}){
  const editing=Boolean(p.id),brandNames=[...new Set([...brands.map(x=>x.name),...products.map(x=>x.brand).filter(Boolean),p.brand].filter(Boolean))],categoryNames=[...new Set([...categories.map(x=>x.name),...products.map(x=>x.category).filter(Boolean),p.category].filter(Boolean))];
  const options=(list,current,placeholder)=>'<option value="">'+placeholder+'</option>'+list.map(x=>'<option value="'+esc(x)+'" '+(current===x?'selected':'')+'>'+esc(x)+'</option>').join('');
  const listText=(key)=>esc(Array.isArray(p[key])?p[key].join('\\n'):(key==='gallery'&&p.img?p.img:''));
  const overlay=document.createElement('div');overlay.style='position:fixed;inset:0;background:#0007;display:grid;place-items:center;padding:16px;z-index:5;overflow:auto';
  overlay.innerHTML='<section class="panel" style="width:min(820px,100%);max-height:96vh;overflow:auto"><div class="heading"><div><h1 style="font-size:19px">'+(editing?'編輯商品':'新增商品')+'</h1><p>管理商品照片、顏色尺寸與售價</p></div><button type="button" class="btn" id="formClose">關閉</button></div><form id="productForm"><input type="hidden" name="id" value="'+(p.id||'')+'"><div class="form-grid"><label class="field">商品名稱<input name="title" required value="'+esc(p.title||'')+'"></label><label class="field">品牌（選填）<select name="brand">'+options(brandNames,p.brand||'','不指定品牌')+'</select></label><label class="field">商品分類<select name="category" required>'+options(categoryNames,p.category||'上衣','選擇分類')+'</select></label><label class="field">來源<select name="country"><option value="korea" '+((p.country||'korea')==='korea'?'selected':'')+'>韓國</option><option value="japan" '+(p.country==='japan'?'selected':'')+'>日本</option></select></label><label class="field">銷售方式<select name="type"><option '+((p.type||'預購')==='預購'?'selected':'')+'>預購</option><option '+(p.type==='現貨'?'selected':'')+'>現貨</option></select></label><label class="field">上架狀態<select name="status"><option value="draft" '+((p.status||'draft')==='draft'?'selected':'')+'>草稿</option><option value="published" '+(p.status==='published'?'selected':'')+'>已上架</option><option value="offline" '+(p.status==='offline'?'selected':'')+'>已下架</option></select></label><label class="field">原價（NT$）<input name="price" type="number" min="0" value="'+(p.price??'')+'" placeholder="未設定時留白"></label><label class="field">特價（NT$）<input name="salePrice" type="number" min="0" value="'+(p.salePrice??'')+'" placeholder="特價時填寫"></label><label class="field">現貨庫存<input name="stockQty" type="number" min="0" value="'+(p.stockQty||0)+'"></label><label class="field">商品標籤<select name="badge"><option value="">不顯示</option>'+['本週新品','限時連線','限時特價'].map(x=>'<option '+(p.badge===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label class="field wide">封面圖片網址<input name="img" value="'+esc(p.img||'')+'" placeholder="貼上 https:// 圖片網址"></label><label class="field wide">商品照片（每行一張，依序顯示）<textarea name="galleryText" placeholder="assets/products/photo-1.jpg&#10;https://...">'+listText('gallery')+'</textarea><span class="tagline">照片依序顯示；顏色選項會對應前方照片，也可從本機多選上傳</span></label><div class="field wide"><span>商品圖片</span><div class="image-upload-tools"><label class="btn" for="imageFile">選擇本機圖片</label><input class="content-upload" type="file" id="imageFile" accept="image/jpeg,image/png,image/webp,image/gif" multiple><span class="image-upload-tip">JPG、PNG、WEBP、GIF，每張最大 5MB</span></div><div id="imagePasteZone" class="image-paste-zone" tabindex="0" role="button" aria-label="貼上商品圖片">點此區域後按 Ctrl+V，貼上截圖或剪貼簿中的圖片</div><div id="imagePreviewGrid" class="image-preview-grid" aria-live="polite"></div></div><label class="field">顏色選項（每行一個）<textarea name="colorsText" placeholder="黑色&#10;灰色">'+listText('colors')+'</textarea></label><label class="field">尺寸選項（每行一個）<textarea name="sizesText" placeholder="S&#10;M&#10;L">'+listText('sizes')+'</textarea></label><label class="field wide">尺寸數據參考<textarea name="sizeGuide" placeholder="例：S 衣長…／M 衣長…">'+esc(p.sizeGuide||'')+'</textarea></label><label class="field wide">尺寸／顏色／SKU 備註<input name="variants" value="'+esc(p.variants||'')+'" placeholder="補充尺寸表或 SKU 資訊"></label><label class="field wide">商品說明<textarea name="description">'+esc(p.description||'')+'</textarea></label></div><div class="message" id="formMessage"></div><div class="form-actions"><button type="button" class="btn" id="cancelForm">取消</button><button class="btn primary">儲存商品</button></div></form></section>';
  document.body.appendChild(overlay);overlay.querySelectorAll('#formClose,#cancelForm').forEach(b=>b.onclick=()=>overlay.remove());overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
  const imgInput=overlay.querySelector('[name="img"]'),galleryInput=overlay.querySelector('[name="galleryText"]'),previewGrid=overlay.querySelector('#imagePreviewGrid'),localUrls=[];let imageUploadsPending=0,imageUploadFailed=false;
  function addPreview(src,label){const tile=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=src;img.alt=label;caption.textContent=label;tile.append(img,caption);previewGrid.append(tile);return caption}
  function renderSavedPreviews(){previewGrid.replaceChildren();const urls=[...new Set([imgInput.value,...galleryInput.value.split(/\\r?\\n/)].map(x=>x.trim()).filter(Boolean))];urls.forEach((url,index)=>addPreview(image(url),'商品圖片 '+(index+1)))}renderSavedPreviews();imgInput.onchange=renderSavedPreviews;galleryInput.onchange=renderSavedPreviews;
  const uploadProductImages=async files=>{const msg=overlay.querySelector('#formMessage'),images=[...files].filter(file=>file&&String(file.type||'').startsWith('image/'));if(!images.length)return;if(images.some(file=>file.size>5*1024*1024)){msg.textContent='每張圖片需小於 5MB。';return}imageUploadsPending++;imageUploadFailed=false;msg.textContent='圖片上傳中…';const previews=images.map(file=>{const url=URL.createObjectURL(file);localUrls.push(url);return addPreview(url,'預覽 · 上傳中…')});try{const urls=[];for(let i=0;i<images.length;i++){const file=images[i],body=new FormData();body.append('file',file,file.name||('clipboard-image-'+Date.now()+'.png'));const result=await api('/api/admin/upload',{method:'POST',body});if(!result.url)throw Error('上傳未回傳圖片網址，請重試。');urls.push(result.url);previews[i].textContent='已上傳';}const current=galleryInput.value.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);galleryInput.value=[...new Set([...current,...urls])].join('\\n');if(!imgInput.value)imgInput.value=urls[0];msg.textContent='已加入 '+urls.length+' 張商品照片，預覽確認後請儲存商品。'}catch(err){imageUploadFailed=true;previews.forEach(caption=>caption.textContent='上傳失敗 · 請重試');msg.textContent=err.message}finally{imageUploadsPending--}};
  overlay.querySelector('#imageFile').onchange=async e=>{await uploadProductImages(e.target.files);e.target.value=''};
  const pasteZone=overlay.querySelector('#imagePasteZone');pasteZone.onclick=()=>pasteZone.focus();pasteZone.addEventListener('paste',async e=>{const files=[...(e.clipboardData?.items||[])].filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();await uploadProductImages(files)}});
  const originalRemove=overlay.remove.bind(overlay);overlay.remove=()=>{localUrls.forEach(url=>URL.revokeObjectURL(url));originalRemove()};
  overlay.querySelector('form').onsubmit=async e=>{e.preventDefault();if(imageUploadsPending||imageUploadFailed){overlay.querySelector('#formMessage').textContent=imageUploadsPending?'請等圖片上傳完成再儲存商品。':'圖片上傳未完成，請重新貼上或選取圖片。';return}const f=new FormData(e.currentTarget),data=Object.fromEntries(f);data.id=data.id?Number(data.id):undefined;data.gallery=data.galleryText.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);data.colors=data.colorsText.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);data.sizes=data.sizesText.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);delete data.galleryText;delete data.colorsText;delete data.sizesText;if(data.img&&!data.gallery.includes(data.img))data.gallery.unshift(data.img);if(!data.img&&data.gallery.length)data.img=data.gallery[0];for(const k of ['price','salePrice','stockQty'])data[k]=data[k]===''?null:Number(data[k]);try{await saveProduct(data);await Promise.all([loadProducts(),loadCatalog()]);overlay.remove();draw()}catch(err){overlay.querySelector('#formMessage').textContent=err.message}};
}
async function saveProduct(p){return api('/api/admin/products',{method:'POST',body:JSON.stringify(p)})}
function drawBrands(c){
 const list=(title,items,kind)=>'<section class="panel"><h2>'+title+'</h2><form class="toolbar" data-add-form="'+kind+'"><input name="name" required maxlength="80" placeholder="新增'+title+'名稱"><button class="btn primary">＋ 新增</button></form><div class="chips">'+(items.map(x=>'<span class="chip">'+esc(x.name)+' <button type="button" aria-label="刪除 '+esc(x.name)+'" data-remove-kind="'+kind+'" data-remove-id="'+x.id+'" style="border:0;background:transparent;color:#999;cursor:pointer;margin-left:6px">×</button></span>').join('')||'<span class="tagline">尚無項目</span>')+'</div></section>';
 c.innerHTML='<div class="heading"><div><h1>品牌與分類</h1><p>管理商品可選品牌，以及前台目錄顯示的分類</p></div></div>'+list('品牌',brands,'brands')+list('商品分類',categories,'categories');
 c.querySelectorAll('[data-add-form]').forEach(form=>form.onsubmit=async e=>{e.preventDefault();const kind=form.dataset.addForm,name=new FormData(form).get('name');try{await api('/api/admin/'+kind,{method:'POST',body:JSON.stringify({name})});await loadCatalog();drawBrands(c)}catch(err){alert(err.message)}});
 c.querySelectorAll('[data-remove-kind]').forEach(button=>button.onclick=async()=>{if(!confirm('確定刪除這個項目？已建立商品的文字資料不會被刪除。'))return;try{await api('/api/admin/'+button.dataset.removeKind+'?id='+button.dataset.removeId,{method:'DELETE'});await loadCatalog();drawBrands(c)}catch(err){alert(err.message)}})
}
function drawMenus(c){
 const actions=[['all','全部商品'],['new','本週新品'],['brand','品牌'],['live','限時連線'],['stock','現貨專區'],['korea','🇰🇷 韓國選品'],['japan','🇯🇵 日本代購'],['sale','限時特價'],['category','商品分類'],['custom','自訂連結／篩選']];
 const roots=menus.filter(x=>!x.parent_id);const labelFor=x=>actions.find(a=>a[0]===x.action)?.[1]||x.action;
 const byParent=menus.filter(x=>x.parent_id).reduce((o,x)=>((o[x.parent_id]||=[]).push(x),o),{});
 const parentChoices=roots.map(root=>'<option value="'+root.id+'">'+esc(root.label)+'</option>'+((byParent[root.id]||[]).map(child=>'<option value="'+child.id+'">　└ '+esc(root.label)+' / '+esc(child.label)+'</option>').join(''))).join('');
 const form='<section class="panel"><h2 id="menuFormHeading">新增導覽項目</h2><form id="menuForm"><input type="hidden" name="id"><div class="form-grid"><label class="field">顯示名稱<input name="label" required maxlength="80" placeholder="例如：商品類別"></label><label class="field">點擊後開啟的商品範圍<select name="action">'+actions.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select><span class="tagline">設定客人點選後顯示哪些商品。例如選「商品分類」，下方填「上衣」。</span></label><label class="field">上層選單<select name="parentId"><option value="">主選單項目</option>'+parentChoices+'</select></label><label class="field">顯示位置<select name="placement"><option value="both">頂部與左側</option><option value="header">僅頂部</option><option value="sidebar">僅左側</option></select></label><label class="field">子分類／品牌名稱<input name="actionValue" maxlength="100" placeholder="分類名稱、品牌名稱或網址"></label><label class="field">排序<input name="sortOrder" type="number" value="0"></label></div><div class="message" id="menuMessage"></div><div class="form-actions"><button type="button" class="btn hidden" id="cancelMenuEdit">取消編輯</button><button class="btn primary">儲存導覽項目</button></div></form></section>';
 const renderRows=(parentId=null,depth=0,parentLabel='主選單')=>menus.filter(x=>(x.parent_id??null)===parentId).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id).map(item=>{const hasChildren=(byParent[item.id]||[]).length>0,canAdd=depth<2,indent='　'.repeat(depth)+(depth?'↳ ':'');return '<tr><td>'+indent+esc(item.label)+'</td><td>'+labelFor(item)+'</td><td>'+esc(parentLabel)+'</td><td>'+({both:'頂部與左側',header:'僅頂部',sidebar:'僅左側'}[item.placement]||item.placement)+'</td><td><div class="row-actions">'+(canAdd?'<button data-add-child="'+item.id+'">新增下拉項</button>':'')+'<button data-edit-menu="'+item.id+'">編輯</button><button data-delete-menu="'+item.id+'">刪除</button></div></td></tr>'+renderRows(item.id,depth+1,item.label)}).join('');
 const tableRows=renderRows();
 c.innerHTML='<div class="heading"><div><h1>導覽選單</h1><p>管理商品頁頂部與左側選單；最多三層，改名後會同步顯示在兩處。</p></div></div>'+form+'<section class="panel"><h2>目前導覽項目</h2><div class="table-wrap"><table><thead><tr><th>名稱</th><th>點擊後顯示</th><th>上層項目</th><th>顯示位置</th><th>管理</th></tr></thead><tbody>'+(tableRows||'<tr><td colspan="5">尚無導覽項目</td></tr>')+'</tbody></table></div></section>';
 const formEl=c.querySelector('#menuForm'),reset=()=>{formEl.reset();formEl.elements.id.value='';formEl.elements.sortOrder.value='0';c.querySelector('#menuFormHeading').textContent='新增導覽項目';c.querySelector('#cancelMenuEdit').classList.add('hidden');c.querySelector('#menuMessage').textContent=''};
 c.querySelector('#cancelMenuEdit').onclick=reset;
 formEl.onsubmit=async e=>{e.preventDefault();const f=new FormData(formEl),data={id:f.get('id')?Number(f.get('id')):undefined,label:f.get('label'),action:f.get('action'),parentId:f.get('parentId')?Number(f.get('parentId')):null,placement:f.get('placement'),actionValue:f.get('actionValue'),sortOrder:Number(f.get('sortOrder'))};try{await api('/api/admin/menus',{method:'POST',body:JSON.stringify(data)});await loadMenus();drawMenus(c)}catch(err){c.querySelector('#menuMessage').textContent=err.message}};
 c.querySelectorAll('[data-edit-menu]').forEach(b=>b.onclick=()=>{const item=menus.find(x=>x.id===Number(b.dataset.editMenu));if(!item)return;for(const key of ['id','label','action','parentId','placement','actionValue','sortOrder'])formEl.elements[key].value=item[key]??'';c.querySelector('#menuFormHeading').textContent='編輯導覽項目';c.querySelector('#cancelMenuEdit').classList.remove('hidden');formEl.scrollIntoView({behavior:'smooth',block:'center'})});
 c.querySelectorAll('[data-add-child]').forEach(b=>b.onclick=()=>{reset();formEl.elements.parentId.value=b.dataset.addChild;formEl.scrollIntoView({behavior:'smooth',block:'center'})});
 c.querySelectorAll('[data-delete-menu]').forEach(b=>b.onclick=async()=>{const item=menus.find(x=>x.id===Number(b.dataset.deleteMenu));if(!item||!confirm('確定刪除「'+item.label+'」'+(menus.some(x=>x.parent_id===item.id)?'及其下拉項目':'')+'？'))return;try{await api('/api/admin/menus?id='+item.id,{method:'DELETE'});await loadMenus();drawMenus(c)}catch(err){alert(err.message)}})
}
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
  // Read-only requests only need a valid signed session. Browsers commonly
  // omit Origin on GET, so requiring Origin/CSRF here prevents the admin UI
  // from loading its products immediately after a successful login.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) &&
      (!sameOrigin(request) || request.headers.get('X-Admin-CSRF') !== session.csrf)) {
    return { error: json({ error: '安全驗證失敗，請重新登入' }, 403) };
  }
  return { session };
}
function parseList(value) { try { const list=JSON.parse(value||'[]'); return Array.isArray(list)?list.filter(x=>typeof x==='string'):[]; } catch { return []; } }
function mapProduct(row) {
  const gallery=parseList(row.gallery);
  return { id: row.id, title: row.title, brand: row.brand, category: row.category, country: row.country, type: row.type, badge: row.badge, img: row.img, gallery: gallery.length?gallery:(row.img?[row.img]:[]), colors: parseList(row.colors), sizes: parseList(row.sizes), price: row.price, salePrice: row.sale_price, stockQty: row.stock_qty, status: row.status, variants: row.variants, description: row.description, sizeGuide: row.size_guide||'', date: row.date };
}
function validImagePath(value) { return typeof value==='string' && value.length<=1600 && (!value || value.startsWith('assets/products/') || value.startsWith('/assets/products/') || value.startsWith('/media/') || /^https:\/\//i.test(value)); }
function validProduct(p) {
  return p && typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= 150 &&
    typeof p.brand === 'string' && p.brand.length <= 80 && ['korea','japan'].includes(p.country) &&
    ['現貨','預購'].includes(p.type) && ['','本週新品','限時連線','限時特價'].includes(p.badge) &&
    ['draft','published','offline'].includes(p.status) && Number.isInteger(p.stockQty ?? 0) && (p.stockQty ?? 0) >= 0 &&
    [p.price,p.salePrice].every(v=>v==null||(Number.isInteger(v)&&v>=0)) &&
    (p.salePrice==null || p.price!=null && p.salePrice<p.price) && validImagePath(p.img) &&
    Array.isArray(p.gallery??[]) && (p.gallery??[]).length<=40 && (p.gallery??[]).every(validImagePath) &&
    ['colors','sizes'].every(k=>Array.isArray(p[k]??[]) && (p[k]??[]).length<=50 && (p[k]??[]).every(x=>typeof x==='string'&&x.length<=80)) &&
    typeof (p.sizeGuide??'')==='string' && (p.sizeGuide??'').length<=10000;
}
async function handleApi(request, env, url) {
  if (url.pathname === '/api/711-stores' && request.method === 'GET') {
    const cities = ['基隆市','台北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義縣','嘉義市','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','連江縣','金門縣','澎湖縣'];
    const city = url.searchParams.get('city') || '';
    if (!cities.includes(city)) return json({ error: '請先選擇有效的縣市。' }, 400);
    const cacheKey = new Request('https://wk-select.internal/api/711-stores?city=' + encodeURIComponent(city));
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    const form = new URLSearchParams({ commandid: 'SearchStore', city, StoreName: '%' });
    const upstream = await fetch('https://emap.pcsc.com.tw/EMapSDK.aspx', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: form.toString()
    });
    if (!upstream.ok) return json({ error: '暫時無法取得 7-ELEVEN 門市資料，請稍後再試。' }, 502);
    const xml = await upstream.text();
    if (xml.length > 12_000_000 || !xml.includes('<GeoPosition')) return json({ error: '7-ELEVEN 門市資料格式暫時無法讀取。' }, 502);
    const unescape = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
    const stores = [...xml.matchAll(/<GeoPosition\b[^>]*>([\s\S]*?)<\/GeoPosition>/gi)].map(match => {
      const field = name => unescape(match[1].match(new RegExp('<' + name + '>([\\s\\S]*?)<\\/' + name + '>', 'i'))?.[1] || '');
      return { id: field('POIID'), name: field('POIName'), address: field('Address') };
    }).filter(store => /^\d{4,8}$/.test(store.id) && store.name && store.address);
    if (!stores.length) return json({ error: '目前沒有取得這個縣市的門市，請稍後再試。' }, 502);
    const result = json({ city, stores }, 200, { 'Cache-Control': 'public, max-age=21600' });
    await cache.put(cacheKey, result.clone());
    return result;
  }
  if (url.pathname === '/api/products' && request.method === 'GET') {
    const { results = [] } = await env.DB.prepare("SELECT * FROM products WHERE status='published' ORDER BY date DESC,id DESC").all();
    return json({ products: results.map(mapProduct) }, 200, { 'Cache-Control': 'public, max-age=30' });
  }
  if (url.pathname === '/api/site-content' && request.method === 'GET') {
    await ensureSiteContentTable(env);
    const row=await env.DB.prepare('SELECT value_json FROM store_site_content WHERE content_key=?').bind('main').first();
    let saved={};try{saved=JSON.parse(row?.value_json||'{}')}catch{}
    const {ckeditorLicenseKey,...publicContent}=mergeSiteContent(saved);return json({content:publicContent},200,{'Cache-Control':'no-store'});
  }
  if (url.pathname === '/api/orders' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '來源驗證失敗' }, 403);
    const payload = await request.json().catch(() => null);
    const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
    const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : '';
    const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
    const shipping = payload?.shipping;
    const storeName = typeof payload?.storeName === 'string' ? payload.storeName.trim() : '';
    const storeId = typeof payload?.storeId === 'string' ? payload.storeId.trim() : '';
    const payment = payload?.payment;
    const note = typeof payload?.note === 'string' ? payload.note.trim() : '';
    const requested = payload?.items;
    if (name.length < 2 || name.length > 80 || !/^[+0-9()\-\s]{9,20}$/.test(phone) || (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) || !['711_cod','711_prepaid'].includes(shipping) || !['711_cod','bank_transfer'].includes(payment) || (shipping === '711_cod' && payment !== '711_cod') || !/^\d{4,8}$/.test(storeId) || storeName.length < 2 || storeName.length > 160 || note.length > 1000 || !Array.isArray(requested) || !requested.length || requested.length > 30) {
      return json({ error: '請完整填寫收件人、電話、超商門市與付款方式。' }, 400);
    }
    const items = [];
    let subtotal = 0;
    for (const item of requested) {
      const id = Number(item?.id), quantity = Number(item?.quantity);
      const color = typeof item?.color === 'string' ? item.color.trim() : '';
      const size = typeof item?.size === 'string' ? item.size.trim() : '';
      if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 || color.length > 80 || size.length > 80) return json({ error: '購物車商品資料有誤，請重新整理後再試。' }, 400);
      const product = await env.DB.prepare("SELECT id,title,brand,type,img,price,sale_price,stock_qty,status,colors,sizes FROM products WHERE id=?").bind(id).first();
      if (!product || product.status !== 'published') return json({ error: '購物車中有商品已下架，請重新整理購物車。' }, 409);
      if (product.price == null) return json({ error: '「'+product.title+'」尚未設定價格，請聯絡客服。' }, 409);
      if (product.stock_qty > 0 && product.type === '現貨' && quantity > product.stock_qty) return json({ error: '「'+product.title+'」庫存不足，請調整數量。' }, 409);
      const colors = parseList(product.colors), sizes = parseList(product.sizes);
      if ((colors.length && !colors.includes(color)) || (sizes.length && !sizes.includes(size))) return json({ error: '「'+product.title+'」的顏色或尺寸選項已變更，請重新選擇。' }, 409);
      const unitPrice = product.sale_price ?? product.price;
      subtotal += unitPrice * quantity;
      items.push({ id:product.id,title:product.title,brand:product.brand,type:product.type,image:product.img,quantity,color,size,unitPrice,lineTotal:unitPrice*quantity });
    }
    const shippingFee = subtotal >= 1800 ? 0 : 60;
    const orderNumber = 'WK' + new Date().toISOString().slice(0,10).replaceAll('-','') + crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase();
    await env.DB.prepare('INSERT INTO store_orders(order_number,customer_name,phone,email,shipping_method,store_name,payment_method,note,items_json,subtotal,shipping_fee,total) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(orderNumber,name,phone,email,shipping,storeName,payment,note,JSON.stringify(items),subtotal,shippingFee,subtotal+shippingFee).run();
    return json({ ok:true, orderNumber, subtotal, shippingFee, total:subtotal+shippingFee }, 201);
  }
  if (url.pathname === '/api/catalog' && request.method === 'GET') {
    const [{ results: brands = [] }, { results: categories = [] }, { results: menus = [] }] = await Promise.all([
      env.DB.prepare('SELECT name FROM store_brands ORDER BY name COLLATE NOCASE').all(),
      env.DB.prepare('SELECT name FROM store_categories ORDER BY id').all(),
      env.DB.prepare('SELECT id,label,action,action_value,parent_id,placement,sort_order FROM store_menu_items WHERE is_active=1 ORDER BY sort_order,id').all()
    ]);
    return json({ brands: brands.map(x => x.name), categories: categories.map(x => x.name), menus }, 200, { 'Cache-Control': 'public, max-age=60' });
  }
  if (url.pathname.startsWith('/media/') && ['GET','HEAD'].includes(request.method)) {
    if (!env.BUCKET) return response('Image storage unavailable', 503);
    const object = await env.BUCKET.get(url.pathname.slice('/media/'.length));
    if (!object) return response('Not Found', 404);
    const headers = new Headers({ 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    object.writeHttpMetadata(headers);
    return new Response(request.method==='HEAD'?null:object.body, { headers });
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
    if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
      const { results = [] } = await env.DB.prepare('SELECT * FROM store_orders ORDER BY id DESC LIMIT 300').all();
      return json({ orders:results.map(row=>{let items=[];try{const parsed=JSON.parse(row.items_json||'[]');if(Array.isArray(parsed))items=parsed}catch{}return {...row,items}}) });
    }
    if (url.pathname === '/api/admin/orders' && request.method === 'POST') {
      const payload = await request.json().catch(() => null);
      const id = Number(payload?.id), status = payload?.status;
      if (!Number.isInteger(id) || id < 1 || !['pending','confirmed','shipped','completed','cancelled'].includes(status)) return json({ error:'訂單狀態資料有誤。' },400);
      const result = await env.DB.prepare('UPDATE store_orders SET status=? WHERE id=?').bind(status,id).run();
      if (!result.meta?.changes) return json({ error:'找不到這筆訂單。' },404);
      return json({ ok:true });
    }
    if (url.pathname === '/api/admin/catalog' && request.method === 'GET') {
      const [{ results: brands = [] }, { results: categories = [] }] = await Promise.all([
        env.DB.prepare('SELECT id,name FROM store_brands ORDER BY name COLLATE NOCASE').all(),
        env.DB.prepare('SELECT id,name FROM store_categories ORDER BY id').all()
      ]);
      return json({ brands, categories });
    }
    if (url.pathname === '/api/admin/site-content' && request.method === 'GET') {
      await ensureSiteContentTable(env);
      const row=await env.DB.prepare('SELECT value_json,updated_at FROM store_site_content WHERE content_key=?').bind('main').first();
      let saved={};try{saved=JSON.parse(row?.value_json||'{}')}catch{}
      return json({content:mergeSiteContent(saved),updatedAt:row?.updated_at||null});
    }
    if (url.pathname === '/api/admin/site-content' && request.method === 'POST') {
      const payload=await request.json().catch(()=>null),incoming=payload?.content;
      if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))return json({error:'網站內容格式不正確。'},400);
      await ensureSiteContentTable(env);
      const row=await env.DB.prepare('SELECT value_json FROM store_site_content WHERE content_key=?').bind('main').first();
      let saved={};try{saved=JSON.parse(row?.value_json||'{}')}catch{}
      const content=mergeSiteContent(saved),urlKeys=new Set(['promoLineUrl','promoInstagramUrl','footerLineUrl','footerInstagramUrl']),imageKeys=new Set(['logoUrl']);
      for(const key of Object.keys(SITE_CONTENT_DEFAULTS)){
        if(incoming[key]===undefined)continue;
        if(key==='announcementRows'||key==='heroSlides'){
          const isAnnouncement=key==='announcementRows',max=isAnnouncement?16:20,rows=incoming[key];
          if(!Array.isArray(rows)||rows.length>max)return json({error:(isAnnouncement?'公告列':'投影片')+'最多 '+max+' 筆。'},400);
          const cleaned=[];
          for(const row of rows){
            if(!row||typeof row!=='object'||Array.isArray(row))return json({error:'公告或投影片資料格式不正確。'},400);
            const main=isAnnouncement?row.text:row.image,secondary=isAnnouncement?'':row.alt,limit=isAnnouncement?160:500;
            if(typeof main!=='string'||main.trim().length>limit||typeof secondary!=='string'||secondary.trim().length>300)return json({error:'公告文字或投影片資料格式不正確。'},400);
            const validUrl=(raw,relative=false)=>{const value=raw.trim();if(value.startsWith('/')&&!value.startsWith('//'))return true;if(relative&&!/^[a-z][a-z\d+.-]*:/i.test(value)&&!value.startsWith('//')&&!value.split(/[?#]/)[0].split('/').includes('..'))return true;try{const parsed=new URL(value);return parsed.protocol==='https:'||parsed.protocol==='http:'}catch{return false}};
            if(!isAnnouncement&&main.trim()&&!validUrl(main,true))return json({error:'投影片圖片需使用有效圖片網址。'},400);
            const sortOrder=Number(row.sortOrder)||cleaned.length+1;cleaned.push(isAnnouncement?{text:main.trim(),sortOrder,enabled:row.enabled!==false}:{image:main.trim(),alt:secondary.trim(),sortOrder,enabled:row.enabled!==false});
          }
          content[key]=cleaned.sort((a,b)=>(a.enabled===false)-(b.enabled===false)||a.sortOrder-b.sortOrder);continue;
        }
        if(typeof incoming[key]!=='string')return json({error:'欄位「'+key+'」必須是文字。'},400);
        const value=incoming[key].trim(),limit=imageKeys.has(key)?500:urlKeys.has(key)?1000:(key==='productContentHtml'?32000:6000);
        if(value.length>limit)return json({error:'欄位內容過長，請縮短後再儲存。'},400);
        if((urlKeys.has(key)||imageKeys.has(key))&&value){let valid=value.startsWith('/')&&!value.startsWith('//');if(!valid&&imageKeys.has(key)&&! /^[a-z][a-z\d+.-]*:/i.test(value)&&!value.startsWith('//')&&!value.split(/[?#]/)[0].split('/').includes('..'))valid=true;if(!valid){try{const parsed=new URL(value);valid=parsed.protocol==='https:'||parsed.protocol==='http:'}catch{}}if(!valid)return json({error:'連結或圖片網址格式不正確。'},400)}
        content[key]=key==='productContentHtml'?sanitizeRichText(value):value;
      }
      await env.DB.prepare('INSERT INTO store_site_content(content_key,value_json) VALUES(?,?) ON CONFLICT(content_key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP').bind('main',JSON.stringify(content)).run();
      return json({ok:true,content});
    }
    if (url.pathname === '/api/admin/menus' && request.method === 'GET') {
      const { results = [] } = await env.DB.prepare('SELECT id,label,action,action_value,parent_id,placement,sort_order,is_active FROM store_menu_items ORDER BY sort_order,id').all();
      return json({ menus: results });
    }
    if (url.pathname === '/api/admin/menus' && request.method === 'POST') {
      const item = await request.json().catch(() => null);
      const actions = ['all','new','brand','live','stock','korea','japan','sale','category','custom'];
      const placements = ['both','header','sidebar'];
      const label = typeof item?.label === 'string' ? item.label.trim() : '';
      const action = item?.action;
      const value = typeof item?.actionValue === 'string' ? item.actionValue.trim() : '';
      const placement = item?.placement;
      const sortOrder = Number(item?.sortOrder);
      const parentId = item?.parentId == null || item.parentId === '' ? null : Number(item.parentId);
      const id = item?.id == null || item.id === '' ? null : Number(item.id);
      if (!label || label.length > 80 || !actions.includes(action) || !placements.includes(placement) || value.length > 100 || !Number.isInteger(sortOrder) || !Number.isInteger(parentId) && parentId !== null || !Number.isInteger(id) && id !== null) return json({ error: '請檢查名稱、選單類型、顯示位置與排序。' }, 400);
      if (parentId !== null) {
        const parent = await env.DB.prepare('SELECT id,parent_id FROM store_menu_items WHERE id=?').bind(parentId).first();
        if (!parent || parentId === id) return json({ error: '請選擇有效的上層選單。' }, 400);
        if (parent.parent_id !== null) {
          const grandparent = await env.DB.prepare('SELECT id,parent_id FROM store_menu_items WHERE id=?').bind(parent.parent_id).first();
          if (!grandparent || grandparent.parent_id !== null || grandparent.id === id) return json({ error: '導覽選單最多支援三層。' }, 400);
        }
      }
      if (id !== null) {
        const existing = await env.DB.prepare('SELECT id FROM store_menu_items WHERE id=?').bind(id).first();
        if (!existing) return json({ error: '找不到這個導覽項目。' }, 404);
        await env.DB.prepare('UPDATE store_menu_items SET label=?,action=?,action_value=?,parent_id=?,placement=?,sort_order=? WHERE id=?').bind(label,action,value,parentId,placement,sortOrder,id).run();
      } else {
        await env.DB.prepare('INSERT INTO store_menu_items(label,action,action_value,parent_id,placement,sort_order) VALUES(?,?,?,?,?,?)').bind(label,action,value,parentId,placement,sortOrder).run();
      }
      return json({ ok: true });
    }
    if (url.pathname === '/api/admin/menus' && request.method === 'DELETE') {
      const id = Number(url.searchParams.get('id'));
      if (!Number.isInteger(id) || id <= 0) return json({ error: '找不到這筆導覽項目。' }, 400);
      await env.DB.prepare('DELETE FROM store_menu_items WHERE id=? OR parent_id=? OR parent_id IN (SELECT id FROM store_menu_items WHERE parent_id=?)').bind(id,id,id).run();
      return json({ ok: true });
    }
    if (url.pathname === '/api/admin/upload' && request.method === 'POST') {
      if (!env.BUCKET) return json({ error: '圖片儲存尚未設定，請稍後再試。' }, 503);
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      const folder = form?.get('folder') === 'site' ? 'site' : 'products';
      const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      if (!file || typeof file.arrayBuffer !== 'function' || !allowed[file.type] || file.size > 5 * 1024 * 1024) {
        return json({ error: '請選擇 JPG、PNG、WEBP 或 GIF 圖片，檔案需小於 5MB。' }, 400);
      }
      const key = folder + '/' + crypto.randomUUID() + '.' + allowed[file.type];
      await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return json({ url: '/media/' + key });
    }
    for (const [path, tableName] of [['/api/admin/brands', 'store_brands'], ['/api/admin/categories', 'store_categories']]) {
      if (url.pathname !== path) continue;
      if (request.method === 'POST') {
        const { name = '' } = await request.json().catch(() => ({}));
        const clean = typeof name === 'string' ? name.trim() : '';
        if (!clean || clean.length > 80) return json({ error: '名稱需為 1–80 個字。' }, 400);
        try { await env.DB.prepare(`INSERT INTO ${tableName}(name) VALUES(?)`).bind(clean).run(); }
        catch { return json({ error: '這個名稱已存在。' }, 409); }
        return json({ ok: true });
      }
      if (request.method === 'DELETE') {
        const id = Number(url.searchParams.get('id'));
        if (!Number.isInteger(id) || id <= 0) return json({ error: '找不到這筆項目。' }, 400);
        await env.DB.prepare(`DELETE FROM ${tableName} WHERE id=?`).bind(id).run();
        return json({ ok: true });
      }
    }
    if (url.pathname === '/api/admin/products' && request.method === 'POST') {
      const p = await request.json().catch(() => null);
      if (!validProduct(p)) return json({ error: '請檢查商品名稱、品牌、價格、庫存或圖片網址。' }, 400);
      const fields = [p.title.trim(),p.brand.trim(),(p.category||'服飾').trim(),p.country,p.type,p.badge,p.img,p.price??null,p.salePrice??null,p.stockQty??0,p.status,p.variants||'',JSON.stringify(p.gallery||[]),JSON.stringify(p.colors||[]),JSON.stringify(p.sizes||[]),p.description||'',p.sizeGuide||'',Number(p.date)||Number(new Date().toISOString().slice(0,10).replaceAll('-',''))];
      let result;
      if (Number.isInteger(p.id) && p.id > 0) {
        result = await env.DB.prepare('UPDATE products SET title=?,brand=?,category=?,country=?,type=?,badge=?,img=?,price=?,sale_price=?,original_price=NULL,stock_qty=?,status=?,variants=?,gallery=?,colors=?,sizes=?,description=?,size_guide=?,date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...fields,p.id).run();
      } else {
        result = await env.DB.prepare('INSERT INTO products(title,brand,category,country,type,badge,img,price,sale_price,stock_qty,status,variants,gallery,colors,sizes,description,size_guide,date) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...fields).run();
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
    if (url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/')) return await handleApi(request, env, url);
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      if (url.search) return response(null, 303, { Location: '/admin', 'Referrer-Policy': 'no-referrer' });
      return response(adminPage, 200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
    }
    const asset = ASSETS?.[url.pathname];
    if (asset) return new Response(Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)), { headers: { 'Content-Type': asset.type, 'Cache-Control': asset.type.startsWith('image/') ? 'public, max-age=31536000, immutable' : 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    return response('Not Found', 404);
  } catch (error) {
    console.error('Request failed', error);
    return json({ error: '伺服器暫時無法處理，請稍後再試。' }, 500);
  }
}
export default { fetch: handle };
