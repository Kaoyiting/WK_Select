import { useState } from "react";
import type { Navigation } from "../../lib/types";
import { Icon } from "../../components/Shared";

export function Menu({
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

export function MobileShopMenu({roots,all,brands,onChoose}:{roots:Navigation[];all:Navigation[];brands:string[];onChoose:(n:Navigation)=>void}){
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
