import { unitPrice } from "../../lib/pricing";
import type { CartItem, Content } from "../../lib/types";
import { money } from "../../lib/api";

export function OrderSummary({ cart, content, compact=false }: { cart: CartItem[]; content: Content; compact?:boolean }) {
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
