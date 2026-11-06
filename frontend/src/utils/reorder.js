import { addToCart } from "../redux/cartSlice";

// Re-fills the cart from a past order using today's prices and stock.
// Returns { added, skipped } where skipped lists items that are gone or short on stock.
export const reorderIntoCart = async ({ orderId, token, dispatch }) => {
  const res = await fetch(`/api/orders/${orderId}/reorder`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Could not reorder");

  (data.items || []).forEach((item) => dispatch(addToCart(item)));
  return { added: (data.items || []).length, skipped: data.skipped || [] };
};

export const describeSkipped = (skipped) =>
  skipped.map((s) => `${s.name} (${s.reason})`).join(", ");
