import {AtmPayment,OrderProducts,OrderDetails,orderStatus,paymentStatus,orderDate} from "./OrderView";
import { isSaleActive, unitPrice } from "../lib/pricing";
import { useEffect, useRef, useState, Fragment, type ReactNode } from "react";
import { api, image, money, setCsrf, startAtmCheckout } from "../lib/api";
import type {
  Product,
  Metadata,
  Content,
  Navigation,
  CartItem,
  Session,
  Order,
  Variant,
} from "../lib/types";
import { Icon, Price, Dialog, SaleCountdown } from "../components/Shared";

const isSoldOut = (p:Product) => p.kind === "stock" && !p.variants.some(v=>v.enabled && (v.stock_qty ?? 0)>0);
const cartLimit = (p:Product,v:Variant) => p.kind === "stock" ? Math.max(0,v.enabled ? (v.stock_qty ?? 0) : 0) : 99;
const availableFirst = (a:Product,b:Product) => Number(isSoldOut(a))-Number(isSoldOut(b));
const emptyMeta: Metadata = { brands: [], categories: [], navigation: [] };
const activeRows = <T extends { enabled: boolean; sortOrder: number }>(
  rows: T[],
) => rows.filter((x) => x.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]),
    [meta, setMeta] = useState(emptyMeta),
    [content, setContent] = useState<Content | null>(null),
    [error, setError] = useState("");
  const [route, setRoute] = useState(location.hash || "#home"),
    [filter, setFilter] = useState<Navigation | null>(null),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [limit, setLimit] = useState(12),
    [sort, setSort] = useState("new"),
    [pageNumber,setPageNumber]=useState(1),
    [previewProduct,setPreviewProduct]=useState<Product|null>(null);
  useEffect(()=>{setPageNumber(1);},[filter,search,limit,sort]);
  useEffect(() => {
    let cancelled = false;
    setPreviewProduct(null);
    if (route.startsWith("#preview/")) {
      api<Product>("/admin/products/" + route.slice(9) + "/preview")
        .then(p => { if (!cancelled) setPreviewProduct(p); })
        .catch(e => { if (!cancelled) setError(e.message); });
    }
    return () => { cancelled = true; };
  }, [route]);
  const [cart, setCart] = useState<CartItem[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("wk-new-cart") || "[]");
      } catch {
        return [];
      }
    }),
    [info, setInfo] = useState(false),
    [toast, setToast] = useState("");
  const [session, setSession] = useState<Session>({
      authenticated: false,
      csrf_token: "",
    }),
    [announcement, setAnnouncement] = useState(0),
    [slide, setSlide] = useState(0);
  useEffect(() => {
    const change = () => {
      setRoute(location.hash || "#home");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    Promise.all([
      api<Product[]>("/catalog/products"),
      api<Metadata>("/catalog/metadata"),
      api<Content>("/site-content"),
    ])
      .then(([p, m, c]) => {
        setProducts(p);
        setCart((old) =>
          old.map((item) => {
            const current = p.find((x) => x.id === item.product.id);
            const variant = current?.variants.find(
              (x) => x.id === item.variant.id,
            );
            return current && variant
              ? { ...item, product: current, variant, quantity: Math.min(item.quantity,cartLimit(current,variant)) }
              : item;
          }),
        );
        setMeta(m);
        setContent(c);
      })
      .catch((e) => setError(e.message));
    api<Session>("/auth/session")
      .then((s) => {
        setSession(s);
        setCsrf("member", s.csrf_token);
        if (
          s.authenticated &&
          sessionStorage.getItem("wk-new-after-login") === "checkout"
        ) {
          sessionStorage.removeItem("wk-new-after-login");
          location.hash = "#checkout";
        }
      })
      .catch((e) => setError(e.message));
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    localStorage.setItem("wk-new-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const a = setInterval(() => setAnnouncement((x) => x + 1), 3800),
      s = setInterval(() => {
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
          setSlide((x) => x + 1);
      }, 5000);
    return () => {
      clearInterval(a);
      clearInterval(s);
    };
  }, []);
  useEffect(() => {
    const refresh = () => { api<Content>("/site-content").then(c => {setContent(c);setSlide(0);setAnnouncement(0);}).catch(() => {}); };
    const changed = (e: StorageEvent) => {if(e.key === "wk-content-updated") refresh();};
    window.addEventListener("storage", changed);
    window.addEventListener("focus", refresh);
    return () => {window.removeEventListener("storage", changed);window.removeEventListener("focus", refresh);};
  }, []);
  function navigate(n: Navigation) {
    setFilter(n);
    setMobile(false);
    location.hash = "#catalog";
  }
  function add(p: Product, v: Variant, quantity = 1) {
    if (!v.id) return;
    const existingQuantity=cart.find(x=>x.variant.id===v.id)?.quantity || 0;
    const max=cartLimit(p,v);
    if(existingQuantity+quantity>max){setToast(max ? `此規格最多可購買 ${max} 件` : "此規格已售罄");return;}
    setCart((old) => {
      const existing = old.find((x) => x.variant.id === v.id);
      return existing
        ? old.map((x) =>
            x === existing ? { ...x, quantity: x.quantity + quantity } : x,
          )
        : [...old, { product: p, variant: v, quantity }];
    });
    setToast("已加入購物車");
  }
  function openProduct(p: Product) {
    location.hash = "#product/" + (p.legacy_id ?? p.id);
  }
  const current = route.startsWith("#preview/")
    ? (previewProduct?.id === route.slice(9) ? previewProduct : undefined)
    : route.startsWith("#product/")
      ? products.find(p => "#product/" + (p.legacy_id ?? p.id) === route)
      : undefined;
  useEffect(()=>{
    if(!route.startsWith("#product/") || !current)return;
    const key="wk-view-"+current.id;
    const t=Date.now();
    if(t-Number(sessionStorage.getItem(key)||0)<1800000)return;
    sessionStorage.setItem(key,String(t));
    api<{counted:boolean}>("/catalog/products/"+current.id+"/view",{method:"POST"}).then(result=>{if(result.counted)setProducts(rows=>rows.map(p=>p.id===current.id?{...p,view_count:(p.view_count||0)+1}:p));}).catch(()=>sessionStorage.removeItem(key));
  },[route,current?.id]);
  let filtered = products.filter(
    (p) =>
      !search ||
      (p.title + " " + p.brand).toLowerCase().includes(search.toLowerCase()),
  );
  if (filter) {
    const a = filter.action,
      v = filter.action_value;
    if (a === "category" || a === "custom")
      filtered = filtered.filter((p) => p.category === (v || filter.label));
    else if (a === "brand")
      filtered = filtered.filter((p) => !v || p.brand === v);
    else if (a === "stock")
      filtered = filtered.filter((p) => p.kind === "stock");
    else if (a === "korea" || a === "japan")
      filtered = filtered.filter((p) => p.country === a);
    else if (["new", "live", "sale"].includes(a))
      filtered = filtered.filter((p) =>
        a === "sale"
          ? p.badge === "限時特價"
          : p.badge ===
            ({ new: "本週新品", live: "限時連線" } as Record<string, string>)[
              a
            ],
      );
  }
  if (sort === "name")
    filtered = [...filtered].sort((a, b) =>
      a.title.localeCompare(b.title, "zh-TW"),
    );
  if (sort === "popular") filtered = [...filtered].sort((a,b)=>(b.order_count || 0)-(a.order_count || 0)||(b.view_count || 0)-(a.view_count || 0));
  filtered = [...filtered].sort(availableFirst);
  const homeProducts = [...products].sort(availableFirst).slice(0,4);
  const pageProducts = filtered.slice((pageNumber-1)*limit,pageNumber*limit);
  const roots = meta.navigation
    .filter((n) => !n.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const announcements = content ? activeRows(content.announcementRows) : [],
    slides = content ? activeRows(content.heroSlides) : [];
  const c = (key: string) => String(content?.[key] ?? "");
  const heading = filter?.label || "全部商品";
  if (!content)
    return <div className="app-loading">{error || "載入商品中…"}</div>;
  return (
    <>
      <div className="promo">
        <div className="promo-rotator" aria-live="polite">
          {announcements.map((a, i) => (
            <div
              key={a.id || i}
              className={
                "promo-message" +
                (i === announcement % announcements.length ? " is-active" : "")
              }
            >
              {a.text}
            </div>
          ))}
        </div>
      </div>
      <header className="header">
        <div className="wrap head-row">
          <a className="brand" href="#home" aria-label="WK.SLELCT 首頁">
            <img src={image(c("logoUrl"))} alt={c("logoAlt")} />
            <span className="brand-word">
              <span>{c("brandName")}</span>
              <small>{c("brandTagline")}</small>
            </span>
          </a>
          <div className="head-spacer" />
          <div className="head-actions">
            <button
              className="icon-btn"
              aria-label="搜尋商品"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Icon name="search" />
            </button>
            <a className="icon-btn" href="#member" aria-label="會員中心">
              <Icon name="user" />
            </a>
            <button
              className="icon-btn"
              aria-label="開啟購物車"
              onClick={() => { location.hash = "#cart"; }}
            >
              <Icon name="cart" />
              <span className="count">
                {cart.reduce((s, x) => s + x.quantity, 0)}
              </span>
            </button>
            <button
              className="icon-btn mobile-menu-toggle"
              aria-label="開啟商品選單"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
        <nav className="menu-row" aria-label="商品導覽">
          {roots
            .filter((n) => n.placement !== "sidebar")
            .map((n) => (
              <Menu
                key={n.id}
                n={n}
                all={meta.navigation}
                brands={meta.brands.map((b) => b.name).sort((a,b)=>a.localeCompare(b,"en",{sensitivity:"base",numeric:true}))}
                onChoose={navigate}
              />
            ))}
        </nav>
        {mobile && <Dialog className="mobile-nav-dialog shop-drawer" title="選購商品" onClose={()=>setMobile(false)}>
          <p className="shop-drawer-intro">探索你的日常選品</p>
          <MobileShopMenu roots={roots.filter(n=>n.placement!=="sidebar")} all={meta.navigation} brands={meta.brands.map(b=>b.name)} onChoose={navigate}/>
        </Dialog>}
        {searchOpen && (
          <div className="searchbar open" style={{ display: "block" }}>
            <div className="wrap">
              <div className="searchbox">
                <input
                  type="search"
                  placeholder="搜尋商品名稱"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    location.hash = "#catalog";
                  }}
                />
                <button aria-label="清除搜尋" onClick={() => setSearch("")}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      <main id="top">
        {error && (
          <div className="wrap app-error" role="alert">
            {error}
          </div>
        )}
        {["#policy/delivery", "#policy/returns"].includes(route) && <section className="policy-page wrap"><h1>{route === "#policy/delivery" ? "寄送政策" : "退換貨政策"}</h1><div className="product-rich-content" dangerouslySetInnerHTML={{__html:c(route === "#policy/delivery" ? "deliveryPolicyHtml" : "returnsPolicyHtml")}} /></section>}
        {route === "#home" && (
          <section className="home-page wrap">
            <div className="home-hero">
              <div className="hero-slides hero-slides-responsive">
                {slides.map((s, i) => (
                  <div key={s.id || i} className={"hero-slide"+(i === slide % slides.length ? " is-active":"")} style={{aspectRatio:s.aspectRatio && s.aspectRatio!=="original" ? s.aspectRatio : undefined}}>
                    <img src={image(s.image)} alt={s.alt} style={{objectFit:s.fit || "contain", height:s.aspectRatio && s.aspectRatio!=="original" ? "100%":"auto"}} />
                  </div>
                ))}
              </div>
              {slides.length>1 && <><button className="hero-arrow hero-arrow-prev" aria-label="上一張投影片" onClick={()=>setSlide(x=>(x+slides.length-1)%slides.length)}>‹</button><button className="hero-arrow hero-arrow-next" aria-label="下一張投影片" onClick={()=>setSlide(x=>(x+1)%slides.length)}>›</button></>}
              <div className="hero-dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    className={
                      "hero-dot" +
                      (i === slide % slides.length ? " is-active" : "")
                    }
                    aria-label={"顯示第 " + (i + 1) + " 張投影片"}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </div>
            <div className="home-section">
              <h2>{c("bestSellersTitle")}</h2>
              <div className="grid home-best-grid">
                {homeProducts.map((p,i) => <Fragment key={p.id}>{isSoldOut(p) && (i===0 || !isSoldOut(homeProducts[i-1])) && <div className="sold-out-divider">售完</div>}<ProductCard p={p} navigation={meta.navigation} openProduct={openProduct}/></Fragment>)}
              </div>
            </div>
          </section>
        )}
        {route === "#catalog" && (
          <section className="catalog wrap">
            <div className="catalog-title">
              <h1>{heading}</h1>
              <p>{c("catalogSubtitle")}</p>
            </div>
            <div className="catalog-tools">
              <div />
              <div className="tool-selects">
                <select
                  aria-label="商品排序"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="new">商品排序　最新上架</option>
                  <option value="name">商品名稱　A–Z</option><option value="popular">熱銷排行</option>
                </select>
                <select
                  aria-label="每頁顯示商品數量"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value={12}>每頁顯示 12 個</option>
                  <option value={24}>每頁顯示 24 個</option>
                  <option value={100}>顯示全部</option>
                </select>
              </div>
            </div>
            <div className="catalog-layout">
              <aside className="catalog-sidebar" aria-label="商品分類">
                <button
                  className="sidebar-heading"
                  onClick={() => {
                    setFilter(null);
                  }}
                >
                  <span>全部商品</span>
                </button>
                <div className="sidebar-categories">
                  {roots
                    .filter(
                      (n) => n.action !== "all" && n.placement !== "header",
                    )
                    .map((n) => (
                      <Menu
                        key={n.id}
                        n={n}
                        all={meta.navigation}
                        brands={meta.brands.map((b) => b.name).sort((a,b)=>a.localeCompare(b,"en",{sensitivity:"base",numeric:true}))}
                        side
                        onChoose={navigate}
                      />
                    ))}
                </div>
              </aside>
              <div className="catalog-results">
                <div className="grid">
                  {pageProducts.map((p,i) => <Fragment key={p.id}>{isSoldOut(p) && (i===0 || !isSoldOut(pageProducts[i-1])) && <div className="sold-out-divider">售完</div>}<ProductCard p={p} navigation={meta.navigation} openProduct={openProduct}/></Fragment>)}
                </div>
                {!filtered.length && (
                  <div className="empty">{c("emptyText")}</div>
                )}
                {filtered.length > limit && <nav className="catalog-pagination" aria-label="商品分頁"><button disabled={pageNumber===1} onClick={()=>{setPageNumber(n=>n-1);window.scrollTo(0,0);}} aria-label="上一頁">‹</button>{Array.from({length:Math.ceil(filtered.length/limit)},(_,i)=><button key={i} aria-current={pageNumber===i+1?"page":undefined} onClick={()=>{setPageNumber(i+1);window.scrollTo(0,0);}}>{i+1}</button>)}<button disabled={pageNumber>=Math.ceil(filtered.length/limit)} onClick={()=>{setPageNumber(n=>n+1);window.scrollTo(0,0);}} aria-label="下一頁">›</button></nav>}
              </div>
            </div>
          </section>
        )}
        {current && route.startsWith("#preview/") && <div className="preview-banner">管理員預覽：此頁不會上架商品，購買操作已停用。</div>}
        {current && (
          <ProductPage
            key={"product-" + current.id}
            p={current}
            content={content}
            preview={!!previewProduct}
            add={add}
            checkout={(p, v, q) => {
              add(p, v, q);
              location.hash = "#cart";
            }}
          />
        )}
        {current && products.some(p=>p.id!==current.id) && <Recommendations key={"recommendations-" + current.id} current={current} products={products} renderCard={p=><ProductCard key={p.id} p={p} navigation={meta.navigation} openProduct={openProduct}/>} />}
        {(route.startsWith("#member") || (route === "#checkout" && !session.authenticated)) && (
          <MemberPage
            session={session}
            onLogin={s=>{setSession(s);setCsrf("member",s.csrf_token);if(sessionStorage.getItem("wk-new-after-login")==="checkout"){sessionStorage.removeItem("wk-new-after-login");location.hash="#checkout";}}}
            onLogout={() => {
              setSession({ authenticated: false, csrf_token: "", google_configured: session.google_configured });
              setCsrf("member", "");
            }}
          />
        )}
      {route === "#cart" && (
        <section className="cart-page wrap"><div className="commerce-heading"><h1>購物車</h1><a href="#catalog">繼續購物 →</a></div><div className="cart-page-layout"><div className="cart-products"><h2>購物車（{cart.reduce((n,x)=>n+x.quantity,0)} 件）</h2><p className="shipping-progress">{cart.reduce((n,x)=>n+unitPrice(x.product)*x.quantity,0)>=content.freeShippingThreshold?"已享免運優惠":"全館滿 "+money(content.freeShippingThreshold)+" 免運"}</p>
          <div className="cart-column-head"><span>商品資料</span><span>數量</span><span>商品小計</span><span/></div><div className="cart-list">
            {cart.length ? (
              cart.map((x, i) => (
                <div className="cart-row" key={x.variant.id}>
                  <img src={image(x.product.gallery[0])} alt="" />
                  <div>
                    <strong>{x.product.title}</strong>
                    <small>
                      {[x.variant.color, x.variant.size]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                    {x.product.kind === "stock" && <small className="stock-note">{cartLimit(x.product,x.variant)>0?`現貨剩餘 ${cartLimit(x.product,x.variant)} 件`:"已售罄"}</small>}
                    <div className="cart-unit-price">單價 {money(unitPrice(x.product))}</div>
                  </div>
                  <div className="qty-control">
                    <button
                      aria-label="減少數量"
                      onClick={() =>
                        setCart(
                          cart.flatMap((r, j) =>
                            j === i
                              ? r.quantity > 1
                                ? [{ ...r, quantity: r.quantity - 1 }]
                                : []
                              : [r],
                          ),
                        )
                      }
                    >
                      −
                    </button>
                    <span>{x.quantity}</span>
                    <button
                      aria-label="增加數量"
                      disabled={x.quantity>=cartLimit(x.product,x.variant)}
                      onClick={() =>
                        setCart(
                          cart.map((r, j) =>
                            j === i ? { ...r, quantity: Math.min(r.quantity + 1,cartLimit(r.product,r.variant)) } : r,
                          ),
                        )
                      }
                    >
                      ＋
                    </button>
                  </div>
                  <strong className="cart-line-total">{money(unitPrice(x.product)*x.quantity)}</strong>
                  <button className="cart-remove" aria-label={"移除 "+x.product.title} onClick={()=>setCart(cart.filter((_,j)=>i!==j))}><TrashIcon/></button>
                </div>
              ))
            ) : (
              <p>購物車目前沒有商品</p>
            )}
          </div>
          </div><aside className="cart-summary"><Summary cart={cart} content={content} compact />
          <button
            className="solid-btn"
            style={{ width: "100%" }}
            disabled={!cart.length || cart.some(x=>x.quantity<1 || x.quantity>cartLimit(x.product,x.variant))}
            onClick={() => {
              if (!session.authenticated) {
                sessionStorage.setItem("wk-new-after-login", "checkout");
                location.hash = "#member";
              } else location.hash = "#checkout";
            }}
          >
            前往結帳
          </button>
        </aside></div></section>
      )}
      {route === "#checkout" && session.authenticated && (
        <Checkout
          cart={cart}
          content={content}
          onClose={() => {location.hash="#cart";}}
          onSuccess={() => setCart([])}
        />
      )}
        {["#cart","#member","#checkout"].some(x=>route.startsWith(x)) && products.length>0 && <section className="commerce-recommendations wrap"><h2>您可能喜歡…</h2><div className="grid">{products.filter(p=>!cart.some(x=>x.product.id===p.id)).sort((a,b)=>availableFirst(a,b)||(b.order_count||0)-(a.order_count||0)||(b.view_count||0)-(a.view_count||0)).slice(0,4).map(p=><ProductCard key={p.id} p={p} navigation={meta.navigation} openProduct={openProduct}/>)}</div></section>}
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          {["footerBlock1", "footerBlock2", "footerBlock3"].map((key) => (
            <section key={key} className="footer-copy">
              <FooterCopy text={c(key)} onInfo={() => setInfo(true)} />
            </section>
          ))}
        </div>
        <div className="wrap copyright">{c("footerCopyright")}</div>
      </footer>
      {info && (
        <Dialog
          className="footer-info-dialog"
          title="商品與訂購說明"
          onClose={() => setInfo(false)}
        >
          <div
            className="product-rich-content"
            dangerouslySetInnerHTML={{ __html: c("productContentHtml") }}
          />
        </Dialog>
      )}
      <div className={"toast" + (toast ? " show" : "")} role="status">
        {toast}
      </div>
    </>
  );
}

function Menu({
  n,
  all,
  onChoose,
  side = false,
  brands,
  depth = 0,
}: {
  n: Navigation;
  all: Navigation[];
  onChoose: (n: Navigation) => void;
  side?: boolean;
  brands: string[];
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  let children =
    n.action === "all"
      ? []
      : all.filter(
          (x) =>
            x.parent_id === n.id &&
            x.placement !== (side ? "header" : "sidebar"),
        );
  if (n.action === "brand" && !n.action_value && !children.length)
    children = brands.map((b, i) => ({
      ...n,
      id: "brand-" + i,
      label: b,
      action_value: b,
      parent_id: n.id,
    }));
  if (n.action === "brand") children = [...children].sort((a,b)=>a.label.localeCompare(b.label,"en",{sensitivity:"base",numeric:true}));
  return (
    <div
      onMouseLeave={() => {if(!side) setOpen(false);}}
      onBlur={e => {if(!side && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);}}
      className={
        (side ? "sidebar-group" : "menu-group") + (open ? " is-open" : "") + (side && n.label.length > 7 ? " long-label" : "")
      }
    >
      <button
        className={side ? "sidebar-item" : "menu-trigger"}
        aria-expanded={children.length ? open : undefined}
        style={side ? { paddingLeft: depth ? 24 : 10 } : undefined}
        onClick={() => {
          if (children.length) setOpen(!open);
          else onChoose(n);
        }}
      >
        <span>{n.label}</span>
        {children.length > 0 && (
          <span className="menu-chevron" aria-hidden="true">
            ⌄
          </span>
        )}
      </button>
      {children.length > 0 && (
        <div
          className={side ? "sidebar-children" : "menu-dropdown"}
          style={side ? { display: open ? "block" : "none" } : undefined}
        >
          {children.map((c) => (
            <Menu
              key={c.id}
              n={c}
              all={all}
              brands={[]}
              side={side}
              depth={depth + 1}
              onChoose={chosen=>{setOpen(false);onChoose(chosen);}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FooterCopy({ text, onInfo }: { text: string; onInfo: () => void }) {
  return (
    <>
      {text
        .split("\n")
        .filter(Boolean)
        .map((line, i) => {
          const markdown = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/),
            url = line.match(/https?:\/\/[^\s]+/);
          const body = markdown ? (
            markdown[2].startsWith("#policy/") ? <a href={markdown[2]}>{markdown[1]}</a> : markdown[2].startsWith("#info/") ? (
              <button className="footer-link" onClick={onInfo}>
                {markdown[1]}
              </button>
            ) : (
              <a href={markdown[2]} target="_blank" rel="noopener noreferrer">
                {markdown[1]}
              </a>
            )
          ) : url ? (
            <a href={url[0]} target="_blank" rel="noopener noreferrer">
              {line.slice(0, url.index).trim() || url[0]}
            </a>
          ) : (
            line
          );
          return i === 0 ? (
            <h2 key={i} className="footer-heading">
              {body}
            </h2>
          ) : (
            <div key={i} className="footer-line">
              {body}
            </div>
          );
        })}
    </>
  );
}

function ProductPage({
  p,
  content,
  add,
  checkout,
  preview = false,
}: {
  preview?: boolean;
  p: Product;
  content: Content;
  add: (p: Product, v: Variant, q: number) => void;
  checkout: (p: Product, v: Variant, q: number) => void;
}) {
  const [photo,setPhoto]=useState(0);
  const [,tickSale]=useState(0);useEffect(()=>{const timer=setInterval(()=>tickSale(n=>n+1),1000);return()=>clearInterval(timer);},[]);
  const variants = p.variants.filter((v) => v.enabled),
    colors = [...new Set(variants.map((v) => v.color))],
    sizes = [...new Set(variants.map((v) => v.size))].sort((a,b)=>{const list=["XXS","XS","S","M","L","XL","XXL","2XL","XXXL","3XL","4XL","5XL"];const x=list.indexOf(a.toUpperCase()),y=list.indexOf(b.toUpperCase());return x>=0 && y>=0 ? x-y : x>=0 ? -1 : y>=0 ? 1 : a.localeCompare(b,undefined,{numeric:true});});
  const [color, setColor] = useState(colors[0] || ""),
    [size, setSize] = useState(sizes[0] || ""),
    [quantity, setQuantity] = useState(1),
    [favorite, setFavorite] = useState(false),
    [error, setError] = useState("");
  const v = variants.find((v) => v.color === color && v.size === size),
    available =
      !preview && !!v &&
      (p.kind === "preorder" || (v.stock_qty ?? 0) >= quantity) &&
      p.price_amount !== null;
  return (
    <section className="product-page wrap">
      <div className="product-breadcrumb">
        <button onClick={() => (location.hash = "#catalog")}>全部商品</button> /{" "}
        {p.brand} / {p.title}
      </div>
      <div className="product-layout">
        <div className="product-gallery-layout">
          <div className="product-thumbs">
            {p.gallery.map((src, i) => (
              <button
                key={src}
                aria-label={"查看商品照片 " + (i + 1)}
                onClick={() => setPhoto(i)}
              >
                <img src={image(src)} alt="" />
              </button>
            ))}
          </div>
          <div className="product-gallery product-carousel">
            {p.gallery.length>0 && <img src={image(p.gallery[photo] || p.gallery[0])} alt={p.title+" "+(photo+1)} />}
            {p.gallery.length>1 && <><button className="product-photo-prev" aria-label="上一張商品照片" onClick={()=>setPhoto(n=>(n+p.gallery.length-1)%p.gallery.length)}>‹</button><button className="product-photo-next" aria-label="下一張商品照片" onClick={()=>setPhoto(n=>(n+1)%p.gallery.length)}>›</button></>}
          </div>
        </div>
        <div className="product-info">
          <div className="product-brand">
            {p.brand}　·　{p.kind === "stock" ? "現貨商品" : "預購商品"}
          </div>
          <h1>{p.title}</h1>
          {p.kind === "stock" && (
            <div className="product-note">
              <p>現貨商品，下單後 3 天內出貨。</p>
            </div>
          )}
          <div className="product-price">
            {isSaleActive(p) ? (
              <>
                <span className="old">{money(p.price_amount!)}</span>
                <strong className="sale">{money(p.sale_amount!)}</strong>
              </>
            ) : (
              <strong>
                {p.price_amount === null ? "價格洽詢" : money(p.price_amount)}
              </strong>
            )}
          </div>
          <SaleCountdown product={p}/><div className="product-controls">
            {colors.some(Boolean) && (
              <label className="product-control">
                顏色
                <select
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    const index = p.gallery.findIndex(
                      (url) => p.image_colors?.[url] === e.target.value,
                    );
                    if (index >= 0) setPhoto(index);
                  }}
                >
                  {colors.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            )}
            {sizes.some(Boolean) && (
              <label className="product-control">
                尺寸
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                  {sizes.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="product-qty">
            <button
              aria-label="減少數量"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              aria-label="增加數量"
              disabled={quantity >= (v ? cartLimit(p,v) : 0)}
              onClick={() => setQuantity(Math.min(quantity + 1,v ? cartLimit(p,v) : 1))}
            >
              ＋
            </button>
          </div>
          {!v && <p>此顏色尺寸組合未提供</p>}
          {p.kind === "stock" && v?.stock_qty === 0 && <p>目前售罄</p>}
          {p.price_amount === null && <p>價格洽詢</p>}
          <div className="product-actions">
            <button
              disabled={!available}
              onClick={() => v && add(p, v, quantity)}
            >
              加入購物車
            </button>
            <button
              disabled={!available}
              onClick={() => v && checkout(p, v, quantity)}
            >
              立即結帳
            </button>
          </div>
          <div className="product-utility">
            <button onClick={() => setFavorite(!favorite)}>
              {favorite ? "♥ 已加入追蹤清單" : "♡ 加入追蹤清單"}
            </button>
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(location.href)
                  .then(() => setError("已複製商品連結"))
                  .catch(() => setError("請複製網址列的商品連結"));
              }}
            >
              分享　↗
            </button>
          </div>
          {error && <p role="status">{error}</p>}
        </div>
      </div>
          <div className="product-sections product-details-below">
            <section className="product-section">
              <h2>商品描述</h2>
              <p>【Product】</p>
              <div
                className="product-rich-content"
                dangerouslySetInnerHTML={{
                  __html:
                    p.description_html || "<p>商品描述將由賣場編輯補充。</p>",
                }}
              />
            </section>
            <section className="product-section product-size-guide">
              <h2>尺寸數據參考</h2>
              <div
                className="product-rich-content"
                dangerouslySetInnerHTML={{
                  __html: p.size_guide_html || "<p>尺寸資訊請洽詢客服。</p>",
                }}
              />
            </section>
            <section className="product-section">
              <div
                className="product-rich-content"
                dangerouslySetInnerHTML={{
                  __html: String(content.productContentHtml || ""),
                }}
              />
            </section>
          </div>
    </section>
  );
}

function Summary({ cart, content, compact=false }: { cart: CartItem[]; content: Content; compact?:boolean }) {
  const sub = cart.reduce(
      (s, x) =>
        s + unitPrice(x.product) * x.quantity,
      0,
    ),
    shipping = sub >= content.freeShippingThreshold ? 0 : content.shippingFee;
  return (
    <>
      <h3>訂單摘要</h3>
      {!compact && cart.map((x) => (
        <div className="checkout-summary-row" key={x.variant.id}>
          <span>
            {x.product.title} × {x.quantity}
          </span>
          <span>
            {money(
              unitPrice(x.product) *
                x.quantity,
            )}
          </span>
        </div>
      ))}
      <div className="checkout-summary-row">
        <span>商品小計</span>
        <span>{money(sub)}</span>
      </div>
      <div className="checkout-summary-row">
        <span>運費</span>
        <span>{shipping ? money(shipping) : "免運"}</span>
      </div>
      <div className="checkout-summary-row checkout-total">
        <span>應付金額</span>
        <span>{money(sub + shipping)}</span>
      </div>
    </>
  );
}

function MemberPage({
  session,
  onLogin,
  onLogout,
}: {
  session: Session;
  onLogin: (s:Session)=>void;
  onLogout: () => void;
}) {
  const [selectedOrder,setSelectedOrder]=useState<Order|null>(null),[preferredStore,setPreferredStore]=useState<PickupStore|null>(null),[storePicker,setStorePicker]=useState(false);
  const [registering,setRegistering]=useState(false), [authBusy,setAuthBusy]=useState(false), [showPassword,setShowPassword]=useState(false);
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(
      location.hash.includes("error=")
        ? "Google登入未完成，請重試或聯絡店主"
        : "",
    ),
    [profile, setProfile] = useState({
      name: "",
      phone: "",
      email: "",
      version: 0,
    });
  useEffect(() => {
    if (session.authenticated) {
      api<Order[]>("/orders")
        .then(setOrders)
        .catch((e) => setError(e.message));
      api<typeof profile & {preferred_store?:PickupStore}>("/me/profile")
        .then(p=>{setProfile(p);setPreferredStore(p.preferred_store||null);})
        .catch((e) => setError(e.message));
    }
  }, [session.authenticated]);
  return (
    <section className={"member-page wrap " + (!session.authenticated ? "member-login" : "member-account")}>
      <h1>{session.authenticated ? "會員中心" : registering ? "註冊會員" : "登入"}</h1>
      {error && (
        <p className="app-error" role="alert">
          {error}
        </p>
      )}
      {!session.authenticated ? (
        <>
          <form className="member-auth-form" onSubmit={async e=>{
            e.preventDefault();setError("");setAuthBusy(true);const f=new FormData(e.currentTarget);
            try {const next=await api<Session>(registering?"/auth/register":"/auth/login",{method:"POST",body:JSON.stringify({email:f.get("email"),password:f.get("password"),...(registering?{name:f.get("name")}: {})})});onLogin(next);}
            catch(e){setError((e as Error).message);}finally{setAuthBusy(false);}
          }}>
            {registering && <label className="auth-line"><span>姓名</span><input name="name" required autoComplete="name" maxLength={120}/></label>}
            <label className="auth-line"><span>電子郵件</span><input name="email" type="email" required autoComplete="email" maxLength={254}/></label>
            <label className="auth-line auth-password"><span>密碼</span><input name="password" type={showPassword?"text":"password"} required minLength={registering?12:1} maxLength={128} autoComplete={registering?"new-password":"current-password"}/><button type="button" className="password-reveal" aria-label={showPassword?"隱藏密碼":"顯示密碼"} onClick={()=>setShowPassword(!showPassword)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!showPassword && <path d="M3 3l18 18"/>}</svg></button></label>
            {registering && <p className="auth-hint">密碼請使用至少 12 個字元。</p>}
            {!registering && <button type="button" className="forgot-password" onClick={()=>setError("忘記密碼請聯繫官方 LINE 客服協助。Google 會員請使用 Google 登入。")}>忘記密碼？</button>}
            <button className="auth-submit" disabled={authBusy}>{authBusy?"處理中…":registering?"註冊並開始購物":"開始購物吧！"}</button>
          </form>
          <div className="auth-separator"><span>或使用其他方式</span></div>
          {session.google_configured && <a className="google-signin" href="/api/v1/auth/google/start" aria-label="使用 Google 登入"><svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.48H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.52l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.95 5.48l3.34 2.59C7.18 7.71 9.39 5.95 12 5.95Z"/></svg></a>}
          <div className="join-member"><h2>{registering?"已經是會員？":"還不是會員？"}</h2><p>建立會員帳號，方便查看訂單與管理聯絡資料。</p><button type="button" onClick={()=>{setRegistering(!registering);setError("");}}>{registering?"返回登入":"註冊會員"}</button></div>
        </>
      ) : (
        <>
          <p className="member-welcome">{session.name}，歡迎回來</p>
          <button
            onClick={() =>
              api("/auth/logout", { method: "POST" })
                .then(onLogout)
                .catch((e) => setError(e.message))
            }
          >
            登出
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api<typeof profile>("/me/profile", {
                method: "PATCH",
                body: JSON.stringify({
                  name: profile.name,
                  phone: profile.phone,
                  email: profile.email,
                  expected_version: profile.version,
                }),
              })
                .then((p) => {
                  setProfile(p);
                  setError("資料已儲存");
                })
                .catch((e) => setError(e.message));
            }}
          >
            <label>
              姓名
              <input
                required
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </label>
            <label>
              電話
              <input
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </label>
            <button>儲存聯絡資料</button>
          </form>
          <section className="preferred-store-panel"><div className="account-section-heading"><h2>常用取貨門市</h2><button type="button" onClick={()=>setStorePicker(true)}>{preferredStore?"更換門市":"新增門市"}</button></div>{preferredStore?<div className="preferred-store-card"><span className="store-logo">7</span><div><strong>7-ELEVEN {preferredStore.name}</strong><p>{preferredStore.address}</p><small>結帳時自動帶入，仍可更換其他門市。</small></div></div>:<p className="account-empty">設定常用門市，讓下次結帳更方便。</p>}</section>
          {storePicker && <StorePicker onClose={()=>setStorePicker(false)} onSelect={async store=>{try{await api("/me/preferred-store",{method:"PUT",body:JSON.stringify({store})});setPreferredStore(store);setStorePicker(false);const p=await api<typeof profile>("/me/profile");setProfile(p);}catch(e){setError((e as Error).message);setStorePicker(false);}}}/>}
          <div className="account-section-heading"><h2>我的訂單</h2><span>{orders.length} 筆訂單</span></div>
          {orders.length?orders.map(o=><article className="member-order order-card" key={o.id}><div className="order-card-header"><div><span className="detail-eyebrow">下單時間</span><p>{orderDate(o.created_at)}</p></div><span className={"order-status status-"+o.status}>{orderStatus(o.status)}{o.is_test&&" · 測試"}</span></div><OrderProducts order={o}/><div className="order-card-footer"><div><small>{paymentStatus(o.payment?.status)}</small><span>合計 <strong>{money(o.total_amount)}</strong></span></div><button onClick={async()=>{try{setSelectedOrder(await api<Order>("/orders/"+o.id));}catch(e){setError((e as Error).message);}}}>查看訂單 <span>→</span></button></div></article>):<p className="account-empty">目前沒有訂單，歡迎挑選喜歡的商品。</p>}
          {selectedOrder && <Dialog className="order-detail-dialog" title="訂單詳情" onClose={()=>setSelectedOrder(null)}><div className="order-reference">訂單編號 {selectedOrder.order_number}<span>{orderDate(selectedOrder.created_at)}</span></div><OrderProducts order={selectedOrder}/><OrderDetails order={selectedOrder}/></Dialog>}
        </>
      )}
    </section>
  );
}

function Checkout({
  cart,
  content,
  onClose,
  onSuccess,
}: {
  cart: CartItem[];
  content: Content;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<Order | null>(null),
    [picker, setPicker] = useState(false),
    [store, setStore] = useState<{
      id: string;
      name: string;
      address: string;
    } | null>(null),
    [shipping, setShipping] = useState("711_cod"),
    [atmEnabled,setAtmEnabled]=useState(false);
  useEffect(()=>{api<{atm_test_enabled:boolean}>("/payments/options").then(x=>setAtmEnabled(x.atm_test_enabled)).catch(()=>{});},[]);
  useEffect(()=>{api<{preferred_store?:PickupStore}>("/me/profile").then(p=>{if(p.preferred_store)setStore(p.preferred_store);}).catch(()=>{});},[]);
  const lastAttempt = useRef({ body: "", key: "" });
  const subtotal = cart.reduce(
      (s, x) =>
        s + unitPrice(x.product) * x.quantity,
      0,
    ),
    fee = subtotal >= content.freeShippingThreshold ? 0 : content.shippingFee;
  return (
    <>
      <section className="checkout-page wrap"><div className="commerce-heading"><h1>{order ? "訂單已送出" : "填寫訂購資料"}</h1>{!order && <button className="outline-btn" onClick={onClose}>返回購物車</button>}</div>
        {order ? (
          <div className="checkout-success">
            <div className="success-mark">✓</div><h2>感謝您的訂購</h2>
            <p>合計 {money(order.total_amount)}</p>
            <p>請至會員中心查看訂單與付款狀態。</p>
            <AtmPayment order={order}/>
            <button
              className="solid-btn"
              onClick={() => {
                onClose();
                location.hash = "#member";
              }}
            >
              查看我的訂單
            </button>
          </div>
        ) : (
          <>
            <p className="checkout-intro">
              請確認商品、配送門市與聯絡資訊。送出後訂單會進入待確認狀態。
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!store) {
                  setError("請先選擇711門市");
                  return;
                }
                const f = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  const body = JSON.stringify({
                    items: cart.map((x) => ({
                      variant_id: x.variant.id,
                      quantity: x.quantity,
                    })),
                    receiver: {
                      name: f.get("name"),
                      phone: f.get("phone"),
                      email: f.get("email"),
                    },
                    store,
                    shipping_method: shipping,
                    payment_method:
                      shipping === "711_cod" ? "711_cod" : atmEnabled ? "ecpay_atm_test" : "bank_transfer",
                    expected_total_amount: subtotal + fee,
                    note: f.get("note"),
                  });
                  if (body !== lastAttempt.current.body)
                    lastAttempt.current = { body, key: crypto.randomUUID() };
                  const result = await api<Order>("/orders", {
                    method: "POST",
                    headers: { "Idempotency-Key": lastAttempt.current.key },
                    body,
                  });
                  setOrder(result);
                  onSuccess();
                  if(result.payment_method==="ecpay_atm_test") await startAtmCheckout(result.id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="checkout-grid">
                <div className="checkout-fields">
                  <div className="checkout-section-title">收件資料</div>
                  <label>
                    收件人姓名
                    <input
                      name="name"
                      required
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    手機號碼
                    <input
                      name="phone"
                      required
                      pattern="09[0-9]{8}"
                      
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    Email（選填）
                    <input name="email" type="email" />
                  </label>
                  <div className="store-field">
                    <span className="store-field-label">7-11 門市</span>
                    <div className="store-field-row">
                      <input
                        readOnly
                        value={
                          store
                            ? store.name +
                              "（" +
                              store.id +
                              "） " +
                              store.address
                            : ""
                        }
                        placeholder="請選擇門市"
                      />
                      <button
                        type="button"
                        className="store-choose"
                        onClick={() => setPicker(true)}
                      >
                        選擇門市
                      </button>
                    </div>
                  </div>
                  <label>
                    配送方式
                    <select
                      value={shipping}
                      onChange={(e) => setShipping(e.target.value)}
                    >
                      <option value="711_cod">7-11 取貨付款</option>
                      <option value="711_prepaid">7-11 取貨不付款</option>
                    </select>
                  </label>
                  <label>
                    付款方式
                    <select
                      value={
                        shipping === "711_cod" ? "711_cod" : atmEnabled ? "ecpay_atm_test" : "bank_transfer"
                      }
                      disabled
                    >
                      <option value="711_cod">7-11 取貨付款</option>
                      {atmEnabled?<option value="ecpay_atm_test">ATM 虛擬帳號（測試，請勿轉帳）</option>:<option value="bank_transfer">銀行轉帳</option>}
                    </select>
                  </label>
                  <label>
                    訂單備註
                    <textarea name="note" maxLength={1000} />
                  </label>
                </div>
                <div>
                  <div className="checkout-summary">
                    <Summary cart={cart} content={content} />
                  </div>
                  <p className="checkout-hint">
                    {shipping==="711_cod"?"請於取貨時付款。":atmEnabled?"ATM 為測試付款，請勿實際轉帳；測試訂單不會安排出貨。":"銀行轉帳請等候客服通知。"}混合現貨與預購商品將待商品到齊後一起寄出。
                  </p>
                </div>
              </div>
              {error && (
                <p className="app-error" role="alert">
                  {error}
                </p>
              )}
              <button className="solid-btn checkout-submit" disabled={busy}>
                {busy ? "送出中…" : "確認送出訂單"}
              </button>
            </form>
          </>
        )}
      </section>
      {picker && <StorePicker onClose={()=>setPicker(false)} onSelect={s=>{setStore(s);setPicker(false);}}/>}
    </>
  );
}

function recommendationType(p:Product){
 const title=p.title.toLowerCase();
 const groups:[string,RegExp][]=[["hoodie",/hoodie|帽踢|帽t|帽ｔ|連帽上衣|連帽外套/],["sweater",/毛衣|針織|sweater|knit/],["jacket",/外套|夾克|jacket|coat/],["hat",/帽|beanie|cap/],["pants",/褲|pants|jeans/],["shirt",/短袖|t恤|短t|t-shirt/],["longshirt",/長袖|長t/],["bag",/包|bag/],["shoes",/鞋|靴|sneaker|boots/]];
 return groups.find(([,pattern])=>pattern.test(title))?.[0] || (p.category && !["上衣","配件","全部商品"].includes(p.category)?p.category:"");
}
function Recommendations({current,products,renderCard}:{current:Product;products:Product[];renderCard:(p:Product)=>ReactNode}){
 const track=useRef<HTMLDivElement>(null);
 const type=recommendationType(current);
 const rank=(p:Product)=>type && recommendationType(p)===type?0:current.brand && p.brand===current.brand?1:2;
 const rows=products.filter(p=>p.id!==current.id).sort((a,b)=>availableFirst(a,b)||rank(a)-rank(b)||(b.order_count||0)-(a.order_count||0)||(b.view_count||0)-(a.view_count||0)||b.date-a.date).slice(0,12);
 return <section className="recommendations wrap"><h2>您可能喜歡…</h2><div className="recommendation-carousel"><button className="recommendation-prev" aria-label="上一組推薦商品" onClick={()=>track.current?.scrollBy({left:-(track.current.clientWidth),behavior:"smooth"})}>‹</button><div className="recommendation-track" ref={track}>{rows.map(p=><div className="recommendation-item" key={p.id}>{renderCard(p)}</div>)}</div><button className="recommendation-next" aria-label="下一組推薦商品" onClick={()=>track.current?.scrollBy({left:track.current.clientWidth,behavior:"smooth"})}>›</button></div></section>;
}

function TrashIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>;}

type PickupStore={id:string;name:string;address:string};
function StorePicker({onClose,onSelect}:{onClose:()=>void;onSelect:(s:PickupStore)=>void}){
const [city,setCity]=useState(""),[town,setTown]=useState(""),[street,setStreet]=useState(""),[query,setQuery]=useState(""),[stores,setStores]=useState<PickupStore[]>([]),[towns,setTowns]=useState<string[]>([]),[storeLoading,setStoreLoading]=useState(false),[storeError,setStoreError]=useState("");
return (        <Dialog
          className="store-picker-dialog"
          title="選擇 7-ELEVEN 門市"
          onClose={onClose}
        >
          <p>依序選擇縣市、區域、街道與門市。</p>
          <div className="store-picker-controls">
            <select
              value={city}
              onChange={async (e) => {
                const value = e.target.value;
                setCity(value); setTown(""); setStreet(""); setTowns([]); setStores([]); setQuery(""); setStoreError("");
                if (!value) return;
                setStoreLoading(true);
                try { setTowns(await api<string[]>("/shipping/711-towns?city="+encodeURIComponent(value))); }
                catch(e) { setStoreError((e as Error).message); }
                finally { setStoreLoading(false); }
              }}
            >
              <option value="">請選擇縣市</option>
              {"基隆市 台北市 新北市 桃園市 新竹市 新竹縣 苗栗縣 台中市 彰化縣 南投縣 雲林縣 嘉義縣 嘉義市 台南市 高雄市 屏東縣 宜蘭縣 花蓮縣 台東縣 連江縣 金門縣 澎湖縣"
                .split(" ")
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
            <label className="field">區域<select value={town} disabled={!towns.length} onChange={async e=>{
              const value=e.target.value; setTown(value);setStreet("");setStores([]);setQuery("");setStoreError("");
              if(!value)return;setStoreLoading(true);
              try {setStores(await api("/shipping/711-stores?city="+encodeURIComponent(city)+"&town="+encodeURIComponent(value)));}
              catch(e){setStoreError((e as Error).message);}finally{setStoreLoading(false);}
            }}><option value="">請選擇區域</option>{towns.map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="field">街道<select value={street} disabled={!stores.length} onChange={e=>setStreet(e.target.value)}><option value="">全部街道</option>{Array.from(new Set(stores.map(s=>s.address.replace(city,"").replace(town,"").match(/^(.+?(?:路|街|大道))/)?.[1]).filter((x):x is string=>!!x))).sort().map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="field">店名<input placeholder="搜尋店名或店號" value={query} onChange={e=>setQuery(e.target.value)} /></label>
          </div>
          <div className="store-picker-list">
            {stores
              .filter((s) => (!street || s.address.includes(street)) && (s.name + s.id).includes(query))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelect(s);
                  }}
                >
                  <strong>
                    {s.name}　{s.id}
                  </strong>
                  <span>{s.address}</span>
                </button>
              ))}
            {storeLoading && <p role="status">載入中…</p>}
            {storeError && <p role="alert">{storeError}</p>}
            {town && !storeLoading && !storeError && !stores.length && <p>此區域目前查無門市，請選擇其他區域。</p>}
          </div>
        </Dialog>);}

function MobileShopMenu({roots,all,brands,onChoose}:{roots:Navigation[];all:Navigation[];brands:string[];onChoose:(n:Navigation)=>void}){
 const [expanded,setExpanded]=useState<string|null>(null),[brandQuery,setBrandQuery]=useState("");
 return <nav className="shop-drawer-navigation" aria-label="手機商品導覽">{roots.map(n=>{
 let children=n.action==="all"?[]:all.filter(x=>x.parent_id===n.id && x.placement!=="header");
 const isBrand=n.action==="brand";
 if(isBrand && !n.action_value && !children.length)children=brands.map((b,i)=>({...n,id:"mobile-brand-"+i,label:b,action_value:b,parent_id:n.id}));
 if(isBrand)children=[...children].sort((a,b)=>a.label.localeCompare(b.label,"en",{sensitivity:"base",numeric:true}));
 const opened=expanded===n.id,hasChildren=children.length>0;
 return <div key={n.id} className={"shop-nav-group"+(opened?" expanded":"")}><button className="shop-nav-root" aria-expanded={hasChildren?opened:undefined} aria-controls={hasChildren?"mobile-nav-"+n.id:undefined} onClick={()=>{if(hasChildren){setExpanded(opened?null:n.id);setBrandQuery("");}else onChoose(n);}}><span>{n.label}</span>{hasChildren && <svg className="shop-expand-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>}</button>
 {hasChildren && opened && <div id={"mobile-nav-"+n.id} className={"shop-nav-expanded "+(isBrand?"shop-brand-panel":"shop-category-panel")}>
 {isBrand && <label className="shop-brand-search"><Icon name="search"/><input type="search" aria-label="搜尋品牌" placeholder="搜尋品牌名稱" value={brandQuery} onChange={e=>setBrandQuery(e.target.value)}/></label>}
 <div className="shop-subitems">{children.filter(c=>!isBrand || c.label.toLocaleLowerCase().includes(brandQuery.trim().toLocaleLowerCase())).map(c=><Menu key={c.id} n={c} all={all} brands={[]} onChoose={onChoose} side depth={0}/> )}</div>
 {isBrand && !children.some(c=>c.label.toLocaleLowerCase().includes(brandQuery.trim().toLocaleLowerCase())) && <p className="shop-brand-empty">找不到符合的品牌</p>}
 </div>}</div>;
 })}</nav>;
}


function ProductCard({p,navigation,openProduct}:{p:Product;navigation:Navigation[];openProduct:(p:Product)=>void}) {
    const [favorite, setFavorite] = useState(false);
    const soldOut = p.kind === "stock" && !p.variants.some(v=>v.enabled && (v.stock_qty ?? 0)>0);
    const badgeAction = (
      { 本週新品: "new", 限時連線: "live", 限時特價: "sale" } as Record<
        string,
        string
      >
    )[p.badge];
    const badge =
      navigation.find((n) => n.action === badgeAction)?.label ||
      (!badgeAction ? p.badge : "");
    return (
      <article className={"card"+(soldOut?" is-sold-out":"")}>
        <div
          className="photo"
          role="link"
          tabIndex={0}
          aria-label={"查看商品：" + p.title}
          onClick={() => openProduct(p)}
          onKeyDown={(e) => {
            if (e.key === "Enter") openProduct(p);
          }}
        >
          <img src={image(p.gallery[0] || "")} alt={p.title} loading="lazy" />
          {soldOut ? <span className="badge sold-out-label">已售罄</span> : badge && <span className="badge">{badge}</span>}
          <div className="card-actions">
            <button
              className={"round favorite" + (favorite ? " active" : "")}
              aria-label={"收藏 " + p.title}
              aria-pressed={favorite}
              onClick={(e) => {
                e.stopPropagation();
                setFavorite(!favorite);
              }}
            >
              <Icon name="heart" />
            </button>
            <button
              className="round add" disabled={soldOut}
              aria-label={"加入 " + p.title + " 購物車"}
              onClick={(e) => {
                e.stopPropagation();
                openProduct(p);
              }}
            >
              <Icon name="cart" />
            </button>
          </div>
        </div>
        <button className="product-link" onClick={() => openProduct(p)}>
          <div className="product-title">{p.title}</div>
          <div className="product-sub">{soldOut ? "已售罄" : p.kind === "stock" ? "現貨" : ""}</div>
          <Price product={p} /><SaleCountdown product={p}/>
        </button>
      </article>
    );
  }
