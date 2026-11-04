import { useState } from "react";
import { ImageUpload } from "./ImageUpload";
function parse(value:string){const doc=new DOMParser().parseFromString(value.replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/(p|div|h[1-6]|li)>/gi,"\n"),"text/html");const urls=[...doc.querySelectorAll("img")].map(el=>el.getAttribute("src")||"").filter(Boolean);return {text:doc.body.textContent?.replace(/\n$/ ,"")||"",urls};}
function escape(value:string){return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
export function TextImageEditor({value,onChange,label,images=false,onBusy}:{value:string;onChange:(html:string)=>void;label:string;images?:boolean;onBusy?:(busy:boolean)=>void}){
 const [initial]=useState(()=>parse(value));const [text,setText]=useState(initial.text),[urls,setUrls]=useState(initial.urls);
 function update(nextText:string,nextUrls:string[]){onChange((nextText?"<p>"+escape(nextText).replace(/\n/g,"<br>")+"</p>":"")+nextUrls.map(url=>'<p><img src="'+escape(url)+'" alt="尺寸參考圖片"></p>').join(""));}
 return <div className="plain-content-editor"><textarea aria-label={label} placeholder={"請輸入"+label} value={text} onChange={e=>{setText(e.target.value);update(e.target.value,urls);}}/>{images&&<><p className="content-help">可輸入尺寸文字，也可選擇或貼上尺寸表照片。</p><ImageUpload urls={urls} onChange={next=>{setUrls(next);update(text,next);}} onBusy={onBusy}/></>}</div>;
}
