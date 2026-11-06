import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type RecordRow = Record<string, string | number | null>;

export function AccountSettings() {
  const [error, setError] = useState(""),
    [logs, setLogs] = useState<RecordRow[]>([]);
  useEffect(() => {
    api<RecordRow[]>("/admin/audit-logs")
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>帳號與操作紀錄</h1>
      <section className="panel">
        <h2>修改自己的密碼</h2>
        <p>
          你與小幫手使用獨立帳號、權限相同。新增帳號／忘記密碼由維運命令處理。
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            api("/admin/auth/change-password", {
              method: "POST",
              body: JSON.stringify(
                Object.fromEntries(new FormData(e.currentTarget)),
              ),
            })
              .then(() => location.reload())
              .catch((e) => setError(e.message));
          }}
        >
          <div className="form-grid">
            <label className="field">
              目前密碼
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              新密碼（至少12字元）
              <input
                name="new_password"
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn primary">修改並重新登入</button>
          </div>
        </form>
        {error && <p className="app-error">{error}</p>}
      </section>
      <section className="panel">
        <h2>最近操作</h2>
        {logs.map((l) => (
          <div className="admin-row" key={l.id}>
            <span>{l.action}</span>
            <small>
              {l.admin_id}　{l.created_at}
            </small>
          </div>
        ))}
      </section>
    </>
  );
}
