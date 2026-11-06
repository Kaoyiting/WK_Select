import { useState } from "react";
import { api } from "../../lib/api";
import { Dialog } from "../../components/Shared";

export type PickupStore={id:string;name:string;address:string};
export function StorePicker({onClose,onSelect}:{onClose:()=>void;onSelect:(s:PickupStore)=>void}){
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
