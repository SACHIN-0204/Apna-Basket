// Online payment for an order that already exists on the server.
// Flow: server creates the Razorpay order from the SAVED total -> customer pays ->
// server verifies the signature. The browser never decides how much to charge.

export class PaymentCancelled extends Error {
  constructor() {
    super("Payment was not completed.");
    this.name = "PaymentCancelled";
  }
}

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Could not load the payment window. Check your internet and try again."));
    document.body.appendChild(script);
  });

const postJson = async (url, token, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
};

/**
 * Opens the Razorpay window for an existing order.
 * Resolves after the server has verified the payment.
 * Rejects with PaymentCancelled if the customer closes the window, or with an Error otherwise.
 */
export const payForOrder = async ({ orderId, token, prefill = {} }) => {
  if (!token) throw new Error("Please log in to pay for your order.");

  await loadRazorpayScript();
  const rp = await postJson("/api/payments/order", token, { orderId });

  return new Promise((resolve, reject) => {
    let handled = false; // set once the customer has paid, so closing the window afterwards is not an error

    const rzp = new window.Razorpay({
      key: rp.keyId,
      amount: rp.amount,
      currency: rp.currency || "INR",
      name: "Kusora",
      description: "Grocery order",
      order_id: rp.id,
      prefill,
      theme: { color: "#1f8a43" },
      handler: async (response) => {
        handled = true;
        try {
          await postJson("/api/payments/verify", token, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve(orderId);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          if (!handled) reject(new PaymentCancelled());
        },
      },
    });

    // A failed attempt keeps the window open so the customer can retry inside it.
    rzp.on("payment.failed", () => {});
    rzp.open();
  });
};
