import { isSaleActive, unitPrice } from "../lib/pricing";
import { useEffect, useState, Fragment } from "react";
import { api, image, money, setCsrf } from "../lib/api";
import type {
  Product,
  Metadata,
  Content,
  Navigation,
  CartItem,
  Session,
  Variant,
} from "../lib/types";
import { Icon, Dialog, SaleCountdown } from "../components/Shared";
import { Menu, MobileShopMenu } from "./storefront/ProductNavigation";
import { StorePicker } from "./storefront/StorePicker";
import { Recommendations } from "./storefront/Recommendations";
import { TrashIcon } from "./storefront/TrashIcon";
import { ProductCard } from "./storefront/ProductCard";
import { ProductPage } from "./storefront/ProductPage";
import { availableFirst, cartLimit, isSoldOut } from "./storefront/productRules";
import { MemberPage } from "./storefront/MemberPage";
import { Checkout } from "./storefront/Checkout";
import { OrderSummary } from "./storefront/OrderSummary";

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
          <a className="brand" href="#home" aria-label="WK.SELECT 首頁">
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
          </div><aside className="cart-summary"><OrderSummary cart={cart} content={content} compact />
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
