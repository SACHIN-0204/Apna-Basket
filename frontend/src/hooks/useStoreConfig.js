import { useEffect, useState } from "react";
import { STORE } from "../config/store";

// Delivery fee, free-delivery threshold and so on come from the server, which is the
// only place that enforces them. Until it answers (or if it fails), the display text
// in config/store.js is used. The checkout total always comes from the server quote.
const FALLBACK = {
  deliveryFee: STORE.deliveryFee,
  freeDeliveryAbove: 0,
  studentDiscountPercent: STORE.studentDiscountPercent,
  slotsEnabled: false,
  serviceAreaEnabled: false,
};

let cached = null;
let inflight = null;

const load = () => {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/store/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("config failed"))))
      .then((data) => { cached = { ...FALLBACK, ...data }; return cached; })
      .catch(() => FALLBACK)
      .finally(() => { inflight = null; });
  }
  return inflight;
};

// Delivery fee for an items total, using the same rule the server applies
export const deliveryFeeFor = (config, itemsTotal) => {
  if (!itemsTotal || itemsTotal <= 0) return 0;
  if (config.freeDeliveryAbove > 0 && itemsTotal >= config.freeDeliveryAbove) return 0;
  return config.deliveryFee;
};

export const useStoreConfig = () => {
  const [config, setConfig] = useState(cached || FALLBACK);
  useEffect(() => {
    let alive = true;
    load().then((c) => { if (alive) setConfig(c); });
    return () => { alive = false; };
  }, []);
  return config;
};
