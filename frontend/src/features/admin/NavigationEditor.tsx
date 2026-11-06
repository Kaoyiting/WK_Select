import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Metadata, Navigation } from "../../lib/types";
import { Icon } from "../../components/Shared";

export function NavigationEditor({
  meta,
  onChange,
}: {
  meta: Metadata;
  onChange: () => Promise<unknown>;
}) {
  const [rows, setRows] = useState<Navigation[]>([]),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Navigation | null>(null);
  const blank = {
    label: "",
    action: "all",
    action_value: "",
    parent_id: "",
    placement: "both",
    sort_order: 0,
    enabled: true,
  };
  const [form, setForm] = useState(blank);
  async function load() {
    setRows(await api("/admin/navigation"));
    await onChange();
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>導覽選單</h1>
      <section className="panel">
        <h2>{editing ? "編輯" : "新增"}導覽項目</h2>
        <p className="content-help">新增「上衣」：顯示名稱填上衣、商品範圍選商品分類、上層選單選商品類別，分類名稱填上衣，再儲存。</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(
                "/admin/navigation" + (editing ? "/" + editing.id : ""),
                {
                  method: editing ? "PATCH" : "POST",
                  body: JSON.stringify({
                    label: form.label,
                    action: form.action,
                    action_value: form.action_value || (form.action === "category" && form.parent_id ? form.label : ""),
                    placement: form.placement,
                    sort_order: form.sort_order,
                    enabled: form.enabled,
                    parent_id: form.parent_id || null,
                    expected_version: editing?.version,
                  }),
                },
              );
              setError("已儲存導覽項目");
              setEditing(null);
              setForm(blank);
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <div className="form-grid">
            <label className="field">
              顯示名稱
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </label>
            <label className="field">
              點擊後開啟的商品範圍
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
              >
                {[
                  ["all", "全部商品"],
                  ["category", "商品分類"],
                  ["brand", "品牌"],
                  ["stock", "現貨專區"],
                  ["korea", "韓國選品"],
                  ["japan", "日本代購"],
                  ["new", "本週新品"],
                  ["sale", "限時特價"],
                  ["custom", "自訂篩選"],
                ]
                  .filter(
                    ([v]) =>
                      ["all", "category", "custom"].includes(v) ||
                      rows.some((r) => r.action === v && r.enabled),
                  )
                  .map(([v, label]) => (
                    <option value={v} key={v}>
                      {rows.find((r) => r.action === v && !r.parent_id)
                        ?.label || label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              上層選單
              <select
                value={form.parent_id}
                onChange={(e) =>
                  setForm({ ...form, parent_id: e.target.value })
                }
              >
                <option value="">主選單項目</option>
                {rows
                  .filter((r) => r.id !== editing?.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              分類／品牌名稱
              <input
                value={form.action_value}
                onChange={(e) =>
                  setForm({ ...form, action_value: e.target.value })
                }
                list="entryNames"
              />
              <datalist id="entryNames">
                {[...meta.brands, ...meta.categories].map((x) => (
                  <option key={x.id}>{x.name}</option>
                ))}
              </datalist>
            </label>
            <label className="field">
              顯示位置
              <select
                value={form.placement}
                onChange={(e) =>
                  setForm({ ...form, placement: e.target.value })
                }
              >
                <option value="both">頂部與左側</option>
                <option value="header">僅頂部</option>
                <option value="sidebar">僅左側</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              取消編輯
            </button>
            <button className="btn primary">儲存導覽項目</button>
          </div>
        </form>
        {error && <p className="app-error">{error}</p>}
      </section>
      <section className="panel">
        <h2>目前導覽項目</h2>
        {[...rows]
          .sort(
            (a, b) =>
              Number(b.enabled) - Number(a.enabled) ||
              a.sort_order - b.sort_order,
          )
          .map((n) => (
            <div className="admin-row" key={n.id}>
              <div className="navigation-item-summary">
                <span className="navigation-item-name">
                  {n.parent_id ? "↳ " : ""}{n.label}
                </span>
                <small className="navigation-item-details">
                  
                  <span>顯示位置：{{ both: "頂部與左側", header: "僅頂部", sidebar: "僅左側" }[n.placement]}</span>
                </small>
              </div>
              <div className="content-list-actions">
                <button
                  className="icon-action edit-icon"
                  aria-label={"編輯 " + n.label}
                  onClick={() => {
                    setEditing(n);
                    setForm({ ...n, parent_id: n.parent_id || "" });
                    window.scrollTo(0, 0);
                  }}
                >
                  <Icon name="edit" />
                </button>
                <button
                  className={
                    "icon-action visibility-icon " +
                    (n.enabled ? "is-visible" : "is-hidden")
                  }
                  aria-label={(n.enabled ? "隱藏 " : "顯示 ") + n.label}
                  aria-pressed={n.enabled}
                  onClick={async () => {
                    try {
                      await api("/admin/navigation/" + n.id, {
                        method: "PATCH",
                        body: JSON.stringify({
                          ...n,
                          expected_version: n.version,
                          id: undefined,
                          version: undefined,
                          enabled: !n.enabled,
                        }),
                      });
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Icon name="eye" />
                </button>
                <button
                  className="icon-action delete-icon" aria-label={"刪除 "+n.label} title={"刪除 "+n.label}
                  onClick={async () => {
                    if (confirm("確定刪除？有下層項目時需先處理下層。"))
                      try {
                        await api("/admin/navigation/" + n.id, {
                          method: "DELETE",
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                  }}
                >
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          ))}
      </section>
    </>
  );
}
