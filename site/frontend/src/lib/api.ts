let memberCsrf = "",
  adminCsrf = "";
export function setCsrf(kind: "member" | "admin", token: string) {
  if (kind === "admin") adminCsrf = token;
  else memberCsrf = token;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (options.method && !["GET", "HEAD"].includes(options.method)) {
    headers.set(
      "X-CSRF-Token",
      path.startsWith("/admin") ? adminCsrf : memberCsrf,
    );
  }
  const response = await fetch("/api/v1" + path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message || "操作失敗，請稍後再試");
  return result.data as T;
}
export const money = (n: number) => "NT$" + n.toLocaleString("zh-TW");
export function image(src: string) {
  return src.startsWith("http") || src.startsWith("/") ? src : "/" + src;
}
export function idempotent(body: unknown) {
  return {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  };
}


export async function startAtmCheckout(orderId:string){
  const data=await api<{action:string;fields:Record<string,string>}>(`/orders/${orderId}/atm-checkout`,{method:"POST"});
  if(data.action!=="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5")throw new Error("測試付款網址不符");
  const form=document.createElement("form");form.method="POST";form.action=data.action;
  for(const [name,value] of Object.entries(data.fields)){const input=document.createElement("input");input.type="hidden";input.name=name;input.value=value;form.append(input)}
  document.body.append(form);form.submit();form.remove();
}
