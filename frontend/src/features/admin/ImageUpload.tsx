import { useRef, useState, type ClipboardEvent } from "react";
import { ImageCropper } from "./ImageCropper";
import { Icon } from "../../components/Shared";
import { api, image } from "../../lib/api";
export function ImageUpload({
  urls,
  crop = false,
  onChange,
  onBusy,
  colors = [],
  imageColors = {},
  onImageColorsChange,
}: {
  urls: string[];
  crop?: boolean;
  onChange: (u: string[]) => void;
  onBusy?: (busy: boolean) => void;
  colors?: string[];
  imageColors?: Record<string, string>;
  onImageColorsChange?: (value: Record<string, string>) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dragIndex=useRef<number|null>(null);
  const [cropFile,setCropFile]=useState<File|null>(null);
  function selectFiles(files:File[]){if(crop && files.length){if(files[0].size>5*1024*1024){setError("每張圖片最大5MB");return;}setCropFile(files[0]);onBusy?.(true);}else upload(files);}
  async function upload(files: File[]) {
    if (!files.length || busy) return;
    setError("");
    setBusy(true);
    onBusy?.(true);
    const local = files.map((f) => URL.createObjectURL(f));
    setPreviews(local);
    try {
      const added: string[] = [];
      for (const f of files) {
        if (f.size > 5 * 1024 * 1024) throw new Error("每張圖片最大5MB");
        const body = new FormData();
        body.append("file", f);
        added.push(
          (
            await api<{ url: string }>("/admin/assets", {
              method: "POST",
              body,
            })
          ).url,
        );
      }
      onChange([...urls, ...added]);
      setPreviews([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      local.forEach(URL.revokeObjectURL);
      setPreviews([]);
      setBusy(false);
      onBusy?.(false);
    }
  }
  function paste(e: ClipboardEvent) {
    const files = [...e.clipboardData.items]
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) {
      e.preventDefault();
      selectFiles(files);
    }
  }
  return (
    <div className="wide">
      {cropFile && <ImageCropper file={cropFile} onCancel={()=>{setCropFile(null);onBusy?.(false);}} onConfirm={file=>{setCropFile(null);upload([file]);}}/>}
      <div className="image-upload-tools">
        <label className="field">
          選擇本機圖片
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple={!crop}
            disabled={busy}
            onChange={(e) => {
              selectFiles([...(e.target.files || [])]);
              e.target.value = "";
            }}
          />
        </label>
        <span className="image-upload-tip">
          JPG、PNG、WEBP、GIF，每張最大5MB
        </span>
      </div>
      <div
        className="image-paste-zone"
        tabIndex={0}
        role="region"
        aria-label="貼上商品圖片"
        onPaste={paste}
      >
        {busy
          ? "圖片上傳中，請稍候…"
          : "點此區域後按 Ctrl+V，貼上截圖或複製的圖片"}
      </div>
      {error && (
        <p className="app-error" role="alert">
          {error}
        </p>
      )}
      <div className="image-preview-grid">
        {urls.map((url, i) => (
          <figure key={url + i} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragIndex.current===null)return;const next=[...urls];const [moved]=next.splice(dragIndex.current,1);next.splice(i,0,moved);onChange(next);dragIndex.current=null;}}>
            <button type="button" className="image-drag-handle" draggable onDragStart={e=>{dragIndex.current=i;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(i));}} onDragEnd={()=>{dragIndex.current=null;}} onPointerDown={e=>{if(e.pointerType==="touch"){e.currentTarget.setPointerCapture(e.pointerId);dragIndex.current=i;}}} onPointerUp={e=>{if(e.pointerType!=="touch")return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest("figure");const figures=[...e.currentTarget.closest(".image-preview-grid")!.querySelectorAll("figure")];const destination=target?figures.indexOf(target):-1;if(destination>=0 && dragIndex.current!==null){const next=[...urls];const [moved]=next.splice(dragIndex.current,1);next.splice(destination,0,moved);onChange(next);}dragIndex.current=null;}} aria-label={"拖曳圖片 " + (i+1)} title="拖曳調整圖片順序">⠿</button>
            <img src={image(url)} alt={"商品圖片 " + (i + 1)} />
            
            {colors.length > 0 && onImageColorsChange && (
              <label className="field">
                對應顏色（選填）
                <select
                  value={imageColors[url] || ""}
                  onChange={(e) => {
                    const next = { ...imageColors };
                    if (e.target.value) next[url] = e.target.value;
                    else delete next[url];
                    onImageColorsChange(next);
                  }}
                >
                  <option value="">共用照片</option>
                  {colors.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="icon-action delete-icon" aria-label={"移除圖片 " + (i + 1)} title="移除圖片"
              onClick={() => onChange(urls.filter((_, j) => i !== j))}
            >
              <Icon name="delete" />
            </button>
          </figure>
        ))}
        {previews.map((url) => (
          <figure key={url}>
            <img src={url} alt="上傳中預覽" />
            <figcaption>預覽／上傳中</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
