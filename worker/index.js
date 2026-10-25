const ASSETS = /*__SITE_ASSETS__*/null;
const SESSION_COOKIE = 'wk_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

const adminPage = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>WK.SLELCT 管理後台</title><style>
:root{font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#202020;background:#f6f6f4;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}.shell{min-height:100vh;display:grid;grid-template-columns:235px 1fr}.side{background:#fff;border-right:1px solid #e9e8e4;padding:22px 16px}.brand{padding:5px 10px 28px;font-weight:700;letter-spacing:.14em}.brand small{display:block;font-size:9px;color:#888;letter-spacing:.2em;margin-top:4px;font-weight:400}.nav{display:grid;gap:5px}.nav button{border:0;background:transparent;text-align:left;padding:12px 13px;color:#646464;cursor:pointer;border-radius:5px;font-size:13px}.nav button.active,.nav button:hover{background:#f7eded;color:#9c1717}.nav .soon{margin-left:5px;color:#aaa;font-size:10px}.main{min-width:0}.top{height:67px;background:white;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;padding:0 30px}.top span{font-size:12px;color:#666}.top button,.btn{border:1px solid #ddd;background:white;padding:9px 14px;border-radius:4px;cursor:pointer}.content{max-width:1200px;margin:0 auto;padding:30px}.heading{display:flex;align-items:end;justify-content:space-between;margin:0 0 22px}.heading h1{font-size:23px;font-weight:500;margin:0}.heading p{font-size:12px;color:#888;margin:7px 0 0}.primary{background:#961919!important;color:white!important;border-color:#961919!important}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}.stat,.panel{background:white;border:1px solid #ecebe8;border-radius:6px;padding:18px}.stat label{display:block;color:#858585;font-size:12px}.stat strong{display:block;font-size:28px;font-weight:500;margin-top:12px}.panel{padding:20px;margin-bottom:16px}.panel h2{font-size:15px;font-weight:600;margin:0 0 15px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:640px}th,td{text-align:left;border-bottom:1px solid #eee;padding:12px 10px;font-size:12px;vertical-align:middle}th{color:#777;font-weight:500;background:#fafafa}.thumb{width:42px;height:42px;object-fit:cover;background:#f5f5f5;border-radius:3px;vertical-align:middle;margin-right:8px}.pill{display:inline-block;background:#f4f0eb;color:#745a3b;border-radius:20px;padding:4px 9px;font-size:10px}.pill.live{background:#edf4ed;color:#467549}.row-actions{display:flex;gap:6px}.row-actions button{background:#fff;border:1px solid #ddd;border-radius:3px;padding:6px 8px;font-size:11px;cursor:pointer}.toolbar{display:flex;gap:9px;align-items:center;margin-bottom:14px}.toolbar input{flex:1;max-width:330px}.field{display:grid;gap:6px;font-size:12px;color:#666}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}input,select,textarea{padding:10px 11px;border:1px solid #ddd;border-radius:3px;background:white;min-width:0;color:#222}textarea{min-height:74px;resize:vertical}.wide{grid-column:1/-1}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}.message{min-height:18px;font-size:12px;color:#9c1717;margin-top:9px}.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login-box{background:#fff;border:1px solid #e7e5e1;border-radius:8px;width:min(420px,100%);padding:34px;box-shadow:0 12px 36px #00000008}.login-box h1{font-size:20px;margin:0 0 7px;font-weight:600}.login-box p{color:#888;font-size:12px;margin:0 0 23px}.login-box form{display:grid;gap:13px}.login-box .btn{padding:12px}.hidden{display:none!important}.empty{padding:24px;text-align:center;color:#888;font-size:13px}.tagline{color:#888;font-size:12px;line-height:1.8}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #e8e4dd;border-radius:20px;padding:7px 12px;background:#fff;font-size:11px;color:#555}
@media(max-width:800px){.shell{grid-template-columns:1fr}.side{border-right:0;border-bottom:1px solid #eee;padding:10px 12px}.brand{padding:6px 9px 12px}.nav{display:flex;overflow:auto;gap:3px}.nav button{white-space:nowrap;padding:9px}.top{height:54px;padding:0 16px}.content{padding:20px 14px}.cards{grid-template-columns:repeat(2,1fr)}.stat{padding:13px}.stat strong{font-size:23px}.heading h1{font-size:19px}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}}
</style></head><body><div id="app"><div class="login"><div class="login-box"><h1>WK.SLELCT 管理後台</h1><p>請使用管理員帳號登入</p><form id="loginForm" method="post" action="/admin" onsubmit="return false"><label class="field">管理員帳號<input name="username" required autocomplete="username"></label><label class="field">密碼<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">登入後台</button><div class="message" id="loginMessage"></div></form></div></div></div><script>
if(location.search)history.replaceState(null,'',location.pathname+location.hash);
const app=document.querySelector('#app');let csrf='',products=[],brands=[],categories=[],menus=[],page='home';const navItems=[['home','總覽'],['products','商品管理'],['menus','導覽選單'],['brands','品牌與分類'],['stock','庫存與預購'],['orders','訂單管理'],['content','網站公告']];
async function api(url,opts={}){const headers={...(opts.headers||{}),...(csrf?{'X-Admin-CSRF':csrf}:{})};if(!(opts.body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(url,{...opts,headers});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'操作失敗');return d}
async function loadCatalog(){const d=await api('/api/admin/catalog');brands=d.brands;categories=d.categories}
async function boot(){try{const s=await api('/api/admin/session');csrf=s.csrf;await Promise.all([loadProducts(),loadCatalog(),loadMenus()]);draw()}catch{drawLogin()}}
async function loadMenus(){menus=(await api('/api/admin/menus')).menus.map(x=>({...x,parentId:x.parent_id,actionValue:x.action_value,sortOrder:x.sort_order}))}
function drawLogin(){app.innerHTML='<div class="login"><div class="login-box"><h1>WK.SLELCT 管理後台</h1><p>請使用管理員帳號登入</p><form id="loginForm" method="post" action="/admin" onsubmit="return false"><label class="field">管理員帳號<input name="username" required autocomplete="username"></label><label class="field">密碼<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">登入後台</button><div class="message" id="loginMessage"></div></form></div></div>';document.querySelector('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),m=document.querySelector('#loginMessage');m.textContent='登入中…';try{const s=await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:f.get('username'),password:f.get('password')})});csrf=s.csrf;await Promise.all([loadProducts(),loadCatalog(),loadMenus()]);draw()}catch(err){m.textContent=err.message}}}
async function loadProducts(){products=(await api('/api/admin/products')).products}
function draw(){const title=navItems.find(x=>x[0]===page)?.[1]||'總覽';app.innerHTML='<div class="shell"><aside class="side"><div class="brand">WK.SLELCT<small>STORE ADMIN</small></div><nav class="nav">'+navItems.map(([id,label])=>'<button data-page="'+id+'" class="'+(page===id?'active':'')+'">'+label+(id==='orders'?'<span class="soon">未開放結帳</span>':'')+'</button>').join('')+'</nav></aside><section class="main"><header class="top"><span>管理後台　/　'+title+'</span><button id="logout">登出</button></header><main class="content" id="content"></main></section></div>';document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;draw()});document.querySelector('#logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});csrf='';drawLogin()};const c=document.querySelector('#content');if(page==='products')drawProducts(c);else if(page==='menus')drawMenus(c);else if(page==='brands')drawBrands(c);else if(page==='stock')drawStock(c);else if(page==='orders')c.innerHTML='<div class="heading"><div><h1>訂單管理</h1><p>目前前台尚未串接線上結帳與訂單建立。</p></div></div><section class="panel"><div class="empty">當網站啟用結帳後，這裡可接上訂單狀態與出貨管理。現在顧客仍透過 LINE／IG 完成下單。</div></section>';else if(page==='content')c.innerHTML='<div class="heading"><div><h1>網站公告</h1><p>公告目前由前台輪播顯示，後台編輯功能將接續加入。</p></div></div><section class="panel"><div class="tagline">前台已設定滿額免運、LINE／IG 詢問與 Olive Young 活動公告。</div></section>';else drawHome(c)}
function drawHome(c){const live=products.filter(p=>p.status==='published').length,pre=products.filter(p=>p.type==='預購').length,low=products.filter(p=>p.type==='現貨'&&Number(p.stockQty)<=2&&p.status==='published').length;c.innerHTML='<div class="heading"><div><h1>商店總覽</h1><p>WK.SLELCT 商品與供貨狀況</p></div><button class="btn primary" id="quickAdd">＋ 新增商品</button></div><div class="cards"><div class="stat"><label>商品總數</label><strong>'+products.length+'</strong></div><div class="stat"><label>目前上架</label><strong>'+live+'</strong></div><div class="stat"><label>預購商品</label><strong>'+pre+'</strong></div><div class="stat"><label>低庫存現貨</label><strong>'+low+'</strong></div></div><section class="panel"><h2>最近更新商品</h2>'+table(products.slice(0,6))+'</section><section class="panel"><h2>營運提醒</h2><div class="tagline">網站目前採 LINE／IG 確認下單，尚未建立線上訂單、金流或會員資料。現貨與預購狀態由商品資料維護。</div></section>';document.querySelector('#quickAdd').onclick=()=>editProduct()}
function priceLabel(p){if(p.salePrice!=null)return '<del style="color:#999">NT$'+Number(p.price).toLocaleString()+'</del> <strong style="color:#a40000">NT$'+Number(p.salePrice).toLocaleString()+'</strong>';return p.price!=null?'NT$'+Number(p.price).toLocaleString():'未設定'}
function table(rows){if(!rows.length)return '<div class="empty">尚無商品</div>';return '<div class="table-wrap"><table><thead><tr><th>商品</th><th>品牌／分類</th><th>供貨方式</th><th>原價／特價</th><th>狀態</th><th>管理</th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+(p.img?'<img class="thumb" src="'+esc(image(p.img))+'">':'')+esc(p.title)+'</td><td>'+esc(p.brand)+'<br><small>'+esc(p.category)+'</small></td><td>'+esc(p.type)+(p.type==='現貨'?' · '+Number(p.stockQty)+' 件':'')+'</td><td>'+priceLabel(p)+'</td><td><span class="pill '+(p.status==='published'?'live':'')+'">'+({published:'已上架',draft:'草稿',offline:'已下架',archived:'已封存'}[p.status]||p.status)+'</span></td><td><div class="row-actions"><button data-edit="'+p.id+'">編輯</button><button data-toggle="'+p.id+'">'+(p.status==='published'?'下架':'上架')+'</button></div></td></tr>').join('')+'</tbody></table></div>'}
function image(src){return src.toLowerCase().startsWith('https://')?src:(src.startsWith('/')?src:'/'+src)}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawProducts(c){c.innerHTML='<div class="heading"><div><h1>商品管理</h1><p>新增、編輯商品與上架狀態</p></div><button class="btn primary" id="newProduct">＋ 新增商品</button></div><section class="panel"><div class="toolbar"><input id="productSearch" placeholder="搜尋商品、品牌"><select id="statusFilter"><option value="">全部狀態</option><option value="published">已上架</option><option value="draft">草稿</option><option value="offline">已下架</option></select></div><div id="productTable"></div></section>';const paint=()=>{const q=document.querySelector('#productSearch').value.toLowerCase(),st=document.querySelector('#statusFilter').value;const list=products.filter(p=>(!st||p.status===st)&&(p.title+' '+p.brand).toLowerCase().includes(q));document.querySelector('#productTable').innerHTML=table(list);bindRows()};document.querySelector('#productSearch').oninput=paint;document.querySelector('#statusFilter').onchange=paint;document.querySelector('#newProduct').onclick=()=>editProduct();paint()}
function bindRows(){document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(products.find(p=>p.id===Number(b.dataset.edit))));document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const p=products.find(x=>x.id===Number(b.dataset.toggle));await saveProduct({...p,status:p.status==='published'?'offline':'published'});await loadProducts();draw()})}
function editProduct(p={}){
  const editing=Boolean(p.id),brandNames=[...new Set([...brands.map(x=>x.name),...products.map(x=>x.brand).filter(Boolean),p.brand].filter(Boolean))],categoryNames=[...new Set([...categories.map(x=>x.name),...products.map(x=>x.category).filter(Boolean),p.category].filter(Boolean))];
  const options=(list,current,placeholder)=>'<option value="">'+placeholder+'</option>'+list.map(x=>'<option value="'+esc(x)+'" '+(current===x?'selected':'')+'>'+esc(x)+'</option>').join('');
  const listText=(key)=>esc(Array.isArray(p[key])?p[key].join('\\n'):(key==='gallery'&&p.img?p.img:''));
  const overlay=document.createElement('div');overlay.style='position:fixed;inset:0;background:#0007;display:grid;place-items:center;padding:16px;z-index:5;overflow:auto';
  overlay.innerHTML='<section class="panel" style="width:min(820px,100%);max-height:96vh;overflow:auto"><div class="heading"><div><h1 style="font-size:19px">'+(editing?'編輯商品':'新增商品')+'</h1><p>管理商品照片、顏色尺寸與售價</p></div><button type="button" class="btn" id="formClose">關閉</button></div><form id="productForm"><input type="hidden" name="id" value="'+(p.id||'')+'"><div class="form-grid"><label class="field">商品名稱<input name="title" required value="'+esc(p.title||'')+'"></label><label class="field">品牌<select name="brand" required>'+options(brandNames,p.brand||'','選擇品牌')+'</select></label><label class="field">商品分類<select name="category" required>'+options(categoryNames,p.category||'上衣','選擇分類')+'</select></label><label class="field">來源<select name="country"><option value="korea" '+((p.country||'korea')==='korea'?'selected':'')+'>韓國</option><option value="japan" '+(p.country==='japan'?'selected':'')+'>日本</option></select></label><label class="field">銷售方式<select name="type"><option '+((p.type||'預購')==='預購'?'selected':'')+'>預購</option><option '+(p.type==='現貨'?'selected':'')+'>現貨</option></select></label><label class="field">上架狀態<select name="status"><option value="draft" '+((p.status||'draft')==='draft'?'selected':'')+'>草稿</option><option value="published" '+(p.status==='published'?'selected':'')+'>已上架</option><option value="offline" '+(p.status==='offline'?'selected':'')+'>已下架</option></select></label><label class="field">原價（NT$）<input name="price" type="number" min="0" value="'+(p.price??'')+'" placeholder="未設定時留白"></label><label class="field">特價（NT$）<input name="salePrice" type="number" min="0" value="'+(p.salePrice??'')+'" placeholder="特價時填寫"></label><label class="field">現貨庫存<input name="stockQty" type="number" min="0" value="'+(p.stockQty||0)+'"></label><label class="field">商品標籤<select name="badge"><option value="">不顯示</option>'+['本週新品','限時連線','限時特價'].map(x=>'<option '+(p.badge===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label class="field wide">封面圖片網址<input name="img" value="'+esc(p.img||'')+'" placeholder="貼上 https:// 圖片網址"></label><label class="field wide">商品照片（每行一張，依序顯示）<textarea name="galleryText" placeholder="assets/products/photo-1.jpg&#10;https://...">'+listText('gallery')+'</textarea><span class="tagline">照片依序顯示；顏色選項會對應前方照片，也可從本機多選上傳</span></label><label class="field wide">上傳商品照片<input type="file" id="imageFile" accept="image/jpeg,image/png,image/webp,image/gif" multiple><span class="tagline">JPG、PNG、WEBP、GIF，每張最大 5MB</span><img id="imagePreview" src="'+(p.img?esc(image(p.img)):'')+'" style="'+(p.img?'':'display:none;')+'max-width:120px;max-height:120px;object-fit:cover;border-radius:4px"></label><label class="field">顏色選項（每行一個）<textarea name="colorsText" placeholder="黑色&#10;灰色">'+listText('colors')+'</textarea></label><label class="field">尺寸選項（每行一個）<textarea name="sizesText" placeholder="S&#10;M&#10;L">'+listText('sizes')+'</textarea></label><label class="field wide">尺寸數據參考<textarea name="sizeGuide" placeholder="例：S 衣長…／M 衣長…">'+esc(p.sizeGuide||'')+'</textarea></label><label class="field wide">尺寸／顏色／SKU 備註<input name="variants" value="'+esc(p.variants||'')+'" placeholder="補充尺寸表或 SKU 資訊"></label><label class="field wide">商品說明<textarea name="description">'+esc(p.description||'')+'</textarea></label></div><div class="message" id="formMessage"></div><div class="form-actions"><button type="button" class="btn" id="cancelForm">取消</button><button class="btn primary">儲存商品</button></div></form></section>';
  document.body.appendChild(overlay);overlay.querySelectorAll('#formClose,#cancelForm').forEach(b=>b.onclick=()=>overlay.remove());overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
  const imgInput=overlay.querySelector('[name="img"]'),galleryInput=overlay.querySelector('[name="galleryText"]'),preview=overlay.querySelector('#imagePreview');imgInput.oninput=()=>{preview.src=imgInput.value?image(imgInput.value):'';preview.style.display=imgInput.value?'block':'none'};
  overlay.querySelector('#imageFile').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;const msg=overlay.querySelector('#formMessage');msg.textContent='圖片上傳中…';try{const urls=[];for(const file of files){const form=new FormData();form.append('file',file);urls.push((await api('/api/admin/upload',{method:'POST',body:form})).url)}const current=galleryInput.value.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);galleryInput.value=[...new Set([...urls,...current])].join('\\n');imgInput.value=urls[0];preview.src=urls[0];preview.style.display='block';msg.textContent='已加入 '+urls.length+' 張商品照片'}catch(err){msg.textContent=err.message}};
  overlay.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),data=Object.fromEntries(f);data.id=data.id?Number(data.id):undefined;data.gallery=data.galleryText.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);data.colors=data.colorsText.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);data.sizes=data.sizesText.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);delete data.galleryText;delete data.colorsText;delete data.sizesText;if(data.img&&!data.gallery.includes(data.img))data.gallery.unshift(data.img);if(!data.img&&data.gallery.length)data.img=data.gallery[0];for(const k of ['price','salePrice','stockQty'])data[k]=data[k]===''?null:Number(data[k]);try{await saveProduct(data);await Promise.all([loadProducts(),loadCatalog()]);overlay.remove();draw()}catch(err){overlay.querySelector('#formMessage').textContent=err.message}};
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
 const form='<section class="panel"><h2 id="menuFormHeading">新增導覽項目</h2><form id="menuForm"><input type="hidden" name="id"><div class="form-grid"><label class="field">顯示名稱<input name="label" required maxlength="80" placeholder="例如：商品類別"></label><label class="field">點擊時顯示內容<select name="action">'+actions.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select></label><label class="field">上層選單<select name="parentId"><option value="">主選單項目</option>'+parentChoices+'</select></label><label class="field">顯示位置<select name="placement"><option value="both">頂部與左側</option><option value="header">僅頂部</option><option value="sidebar">僅左側</option></select></label><label class="field">子分類／品牌名稱<input name="actionValue" maxlength="100" placeholder="分類名稱、品牌名稱或網址"></label><label class="field">排序<input name="sortOrder" type="number" value="0"></label></div><div class="message" id="menuMessage"></div><div class="form-actions"><button type="button" class="btn hidden" id="cancelMenuEdit">取消編輯</button><button class="btn primary">儲存導覽項目</button></div></form></section>';
 const renderRows=(parentId=null,depth=0,parentLabel='主選單')=>menus.filter(x=>(x.parent_id??null)===parentId).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id).map(item=>{const hasChildren=(byParent[item.id]||[]).length>0,canAdd=depth<2,indent='　'.repeat(depth)+(depth?'↳ ':'');return '<tr><td>'+indent+esc(item.label)+'</td><td>'+labelFor(item)+'</td><td>'+esc(parentLabel)+'</td><td>'+({both:'頂部與左側',header:'僅頂部',sidebar:'僅左側'}[item.placement]||item.placement)+'</td><td><div class="row-actions">'+(canAdd?'<button data-add-child="'+item.id+'">新增下拉項</button>':'')+'<button data-edit-menu="'+item.id+'">編輯</button><button data-delete-menu="'+item.id+'">刪除</button></div></td></tr>'+renderRows(item.id,depth+1,item.label)}).join('');
 const tableRows=renderRows();
 c.innerHTML='<div class="heading"><div><h1>導覽選單</h1><p>管理商品頁頂部與左側選單；最多三層，改名後會同步顯示在兩處。</p></div></div>'+form+'<section class="panel"><h2>目前導覽項目</h2><div class="table-wrap"><table><thead><tr><th>名稱</th><th>顯示內容</th><th>上層項目</th><th>顯示位置</th><th>管理</th></tr></thead><tbody>'+(tableRows||'<tr><td colspan="5">尚無導覽項目</td></tr>')+'</tbody></table></div></section>';
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
  if (url.pathname === '/api/products' && request.method === 'GET') {
    const { results = [] } = await env.DB.prepare("SELECT * FROM products WHERE status='published' ORDER BY date DESC,id DESC").all();
    return json({ products: results.map(mapProduct) }, 200, { 'Cache-Control': 'public, max-age=30' });
  }
  if (url.pathname === '/api/catalog' && request.method === 'GET') {
    const [{ results: brands = [] }, { results: categories = [] }, { results: menus = [] }] = await Promise.all([
      env.DB.prepare('SELECT name FROM store_brands ORDER BY name COLLATE NOCASE').all(),
      env.DB.prepare('SELECT name FROM store_categories ORDER BY id').all(),
      env.DB.prepare('SELECT id,label,action,action_value,parent_id,placement,sort_order FROM store_menu_items WHERE is_active=1 ORDER BY sort_order,id').all()
    ]);
    return json({ brands: brands.map(x => x.name), categories: categories.map(x => x.name), menus }, 200, { 'Cache-Control': 'public, max-age=60' });
  }
  if (url.pathname.startsWith('/media/') && request.method === 'GET') {
    if (!env.BUCKET) return response('Image storage unavailable', 503);
    const object = await env.BUCKET.get(url.pathname.slice('/media/'.length));
    if (!object) return response('Not Found', 404);
    const headers = new Headers({ 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    object.writeHttpMetadata(headers);
    return new Response(object.body, { headers });
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
    if (url.pathname === '/api/admin/catalog' && request.method === 'GET') {
      const [{ results: brands = [] }, { results: categories = [] }] = await Promise.all([
        env.DB.prepare('SELECT id,name FROM store_brands ORDER BY name COLLATE NOCASE').all(),
        env.DB.prepare('SELECT id,name FROM store_categories ORDER BY id').all()
      ]);
      return json({ brands, categories });
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
      const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      if (!file || typeof file.arrayBuffer !== 'function' || !allowed[file.type] || file.size > 5 * 1024 * 1024) {
        return json({ error: '請選擇 JPG、PNG、WEBP 或 GIF 圖片，檔案需小於 5MB。' }, 400);
      }
      const key = 'products/' + crypto.randomUUID() + '.' + allowed[file.type];
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
    if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
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
