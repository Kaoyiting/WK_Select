import { useRef, type ReactNode } from "react";
import type { Product } from "../../lib/types";
import { availableFirst } from "./productRules";

function recommendationType(p:Product){
 const title=p.title.toLowerCase();
 const groups:[string,RegExp][]=[["hoodie",/hoodie|帽踢|帽t|帽ｔ|連帽上衣|連帽外套/],["sweater",/毛衣|針織|sweater|knit/],["jacket",/外套|夾克|jacket|coat/],["hat",/帽|beanie|cap/],["pants",/褲|pants|jeans/],["shirt",/短袖|t恤|短t|t-shirt/],["longshirt",/長袖|長t/],["bag",/包|bag/],["shoes",/鞋|靴|sneaker|boots/]];
 return groups.find(([,pattern])=>pattern.test(title))?.[0] || (p.category && !["上衣","配件","全部商品"].includes(p.category)?p.category:"");
}
export function Recommendations({current,products,renderCard}:{current:Product;products:Product[];renderCard:(p:Product)=>ReactNode}){
 const track=useRef<HTMLDivElement>(null);
 const type=recommendationType(current);
 const rank=(p:Product)=>type && recommendationType(p)===type?0:current.brand && p.brand===current.brand?1:2;
 const rows=products.filter(p=>p.id!==current.id).sort((a,b)=>availableFirst(a,b)||rank(a)-rank(b)||(b.order_count||0)-(a.order_count||0)||(b.view_count||0)-(a.view_count||0)||b.date-a.date).slice(0,12);
 return <section className="recommendations wrap"><h2>您可能喜歡…</h2><div className="recommendation-carousel"><button className="recommendation-prev" aria-label="上一組推薦商品" onClick={()=>track.current?.scrollBy({left:-(track.current.clientWidth),behavior:"smooth"})}>‹</button><div className="recommendation-track" ref={track}>{rows.map(p=><div className="recommendation-item" key={p.id}>{renderCard(p)}</div>)}</div><button className="recommendation-next" aria-label="下一組推薦商品" onClick={()=>track.current?.scrollBy({left:track.current.clientWidth,behavior:"smooth"})}>›</button></div></section>;
}
